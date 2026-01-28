<?php
/*
 * Plugin Name: My Streamlined Plugin
 * Version: 1.0.0
 */

defined( 'ABSPATH' ) || exit;

// The "One Simple Class" to handle updates.
class My_Plugin_Updater {
    private $slug;
    private $worker_url;
    private $current_version;

    public function __construct( $slug, $version, $worker_url ) {
        $this->slug = $slug;
        $this->current_version = $version;
        $this->worker_url = $worker_url;

        // Hook into the update check.
        add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'check_update' ] );
        // Hook into the plugin details popup.
        add_filter( 'plugins_api', [ $this, 'check_info' ], 10, 3 );
    }

    public function check_update( $transient ) {
        if ( empty( $transient->checked ) ) return $transient;

        // Ask Cloudflare for the latest version.
        $remote = $this->request();

        if ( $remote && version_compare( $this->current_version, $remote->new_version, '<' ) ) {
            $res = new stdClass();
            $res->slug = $this->slug;
            $res->plugin = plugin_basename( __FILE__ ); 
            $res->new_version = $remote->new_version;
            $res->package = $remote->package;
            $res->url = $remote->url;
            
            $transient->response[ $res->plugin ] = $res;
        }
        return $transient;
    }

    public function check_info( $false, $action, $arg ) {
        if ( 'plugin_information' !== $action || $this->slug !== $arg->slug ) return $false;
        $remote = $this->request();
        if ( ! $remote ) return $false;
        
        // Map fields for the popup window.
        $res = new stdClass();
        $res->name = 'My Plugin';
        $res->slug = $this->slug;
        $res->version = $remote->new_version;
        $res->download_link = $remote->package;
        // You can add 'sections' => ['description' => '...'] here if needed.
        return $res;
    }

    private function request() {
        $response = wp_remote_get( $this->worker_url );
        if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
            return false;
        }
        return json_decode( wp_remote_retrieve_body( $response ) );
    }
}

// Initialize
new My_Plugin_Updater( 'my-plugin-slug', '1.0.0', 'https://your-worker.your-domain.workers.dev' );
