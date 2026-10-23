<?php
/**
 * Plugin Name:       Cine Archive — Blog
 * Plugin URI:        https://cinearchive.es
 * Description:       Une el blog con el archivo: campos del artículo (antetítulo, portada, cifras, galería, películas, fuentes), enlaces a las fichas de cinearchive.es, datos de TMDB, la portada de artículos de la web y el importador de los artículos que ya existían.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Sergio Fernández Morales
 * License:           GPL-2.0-or-later
 * Text Domain:       cinearchive
 *
 * Va en un plugin y no en el tema para que los datos de los artículos no
 * dependan del aspecto: si un día se cambia de tema, los campos, los enlaces a
 * las fichas y lo que lee la web siguen funcionando.
 */

defined( 'ABSPATH' ) || exit;

define( 'CA_BLOG_VERSION', '1.0.0' );
define( 'CA_BLOG_DIR', plugin_dir_path( __FILE__ ) );

require_once CA_BLOG_DIR . 'includes/lang.php';
require_once CA_BLOG_DIR . 'includes/settings.php';
require_once CA_BLOG_DIR . 'includes/tmdb.php';
require_once CA_BLOG_DIR . 'includes/meta.php';
require_once CA_BLOG_DIR . 'includes/article.php';
require_once CA_BLOG_DIR . 'includes/shortcodes.php';
require_once CA_BLOG_DIR . 'includes/rest.php';
require_once CA_BLOG_DIR . 'includes/redirect.php';
require_once CA_BLOG_DIR . 'includes/import.php';
