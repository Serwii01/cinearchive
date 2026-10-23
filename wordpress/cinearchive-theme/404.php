<?php
/** No encontrado: lo mismo que el 404 de la web, con vuelta al blog. */
defined( 'ABSPATH' ) || exit;
status_header( 404 );
get_header();
?>
<section class="frame notfound">
	<span class="label">404</span>
	<h1><?php echo esc_html( cat_t( 'error.title' ) ); ?></h1>
	<p><?php echo esc_html( cat_t( 'error.text' ) ); ?></p>
	<a class="btn" href="<?php echo esc_url( cat_blog_home() ); ?>"><?php echo esc_html( cat_t( 'articles.title' ) ); ?> →</a>
</section>
<?php
get_footer();
