<?php
/**
 * Plugin Name:       OpenUPI for WooCommerce
 * Plugin URI:        https://github.com/senapati484/openupi
 * Description:       Zero-fee UPI payment gateway for WooCommerce using your self-hosted OpenUPI server.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Tested up to:      6.5
 * Requires PHP:      8.0
 * Author:            Sayan Senapati
 * Author URI:        https://github.com/senapati484
 * License:           MIT
 * Text Domain:       openupi-woocommerce
 */

defined('ABSPATH') || exit;

add_action('plugins_loaded', 'openupi_init_gateway_class');

function openupi_init_gateway_class(): void {
    if (!class_exists('WC_Payment_Gateway')) return;

    class WC_OpenUPI_Gateway extends WC_Payment_Gateway {
        public function __construct() {
            $this->id                 = 'openupi';
            $this->method_title       = 'OpenUPI';
            $this->method_description = 'Accept UPI payments via your self-hosted OpenUPI gateway. Zero fees.';
            $this->has_fields         = false;
            $this->supports           = ['products'];

            $this->init_form_fields();
            $this->init_settings();

            $this->title       = $this->get_option('title');
            $this->description = $this->get_option('description');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
            add_action('woocommerce_api_openupi_webhook', [$this, 'handle_webhook']);
        }

        public function init_form_fields(): void {
            $this->form_fields = [
                'enabled' => [
                    'title'   => 'Enable/Disable',
                    'type'    => 'checkbox',
                    'label'   => 'Enable OpenUPI Payment',
                    'default' => 'yes',
                ],
                'title' => [
                    'title'   => 'Title',
                    'type'    => 'text',
                    'default' => 'Pay via UPI',
                ],
                'description' => [
                    'title'   => 'Description',
                    'type'    => 'text',
                    'default' => 'Scan QR or use any UPI app. No extra charges.',
                ],
                'server_url' => [
                    'title'   => 'OpenUPI Server URL',
                    'type'    => 'text',
                    'default' => 'https://pay.yourdomain.com',
                ],
                'api_key' => [
                    'title' => 'Merchant API Key',
                    'type'  => 'password',
                ],
            ];
        }

        public function process_payment($order_id): array {
            $order      = wc_get_order($order_id);
            $server_url = rtrim($this->get_option('server_url'), '/');
            $api_key    = $this->get_option('api_key');
            $amount     = $order->get_total();
            $callback   = home_url('/wc-api/openupi_webhook/');

            $response = wp_remote_post("$server_url/api/v1/orders/create", [
                'headers' => ['Content-Type' => 'application/json', 'x-api-key' => $api_key],
                'body'    => wp_json_encode([
                    'orderId'     => "WC-$order_id",
                    'amount'      => (float) $amount,
                    'note'        => "WooCommerce Order #$order_id",
                    'callbackUrl' => $callback,
                ]),
                'timeout' => 20,
            ]);

            if (is_wp_error($response)) {
                wc_add_notice('Payment gateway error: ' . $response->get_error_message(), 'error');
                return ['result' => 'failure'];
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (empty($body['exactAmount'])) {
                wc_add_notice('OpenUPI gateway unavailable. Please try again.', 'error');
                return ['result' => 'failure'];
            }

            // Store exact amount so webhook can match by order ID
            $order->update_meta_data('_openupi_exact_amount', $body['exactAmount']);
            $order->update_meta_data('_openupi_qr_svg', $body['qrSvg']);
            $order->update_meta_data('_openupi_upi_intent', $body['upiIntent']);
            $order->update_meta_data('_openupi_expires_at', $body['expiresAt']);
            $order->save();

            // Redirect to thank-you page with embedded QR display
            return [
                'result'   => 'success',
                'redirect' => add_query_arg(['openupi_order' => $order_id], $this->get_return_url($order)),
            ];
        }

        /**
         * Receives HMAC-signed webhook from OpenUPI backend after payment match.
         */
        public function handle_webhook(): void {
            $raw_body  = file_get_contents('php://input');
            $timestamp = $_SERVER['HTTP_X_OPENUPI_TIMESTAMP'] ?? '';
            $signature = $_SERVER['HTTP_X_OPENUPI_SIGNATURE'] ?? '';
            $api_key   = $this->get_option('api_key');

            $expected = hash_hmac('sha256', "$raw_body.$timestamp", $api_key);
            if (!hash_equals($expected, $signature)) {
                status_header(401);
                echo 'Unauthorized';
                exit;
            }

            $payload  = json_decode($raw_body, true);
            $order_id = str_replace('WC-', '', $payload['orderId'] ?? '');
            $order    = wc_get_order((int) $order_id);

            if ($order && $payload['status'] === 'PAID') {
                $order->payment_complete($payload['utr']);
                $order->add_order_note("OpenUPI payment confirmed | UTR: {$payload['utr']}");
            }

            status_header(200);
            echo json_encode(['received' => true]);
            exit;
        }
    }

    // Register gateway with WooCommerce
    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_OpenUPI_Gateway';
        return $gateways;
    });
}
