<?php
/**
 * Cabecera: la misma barra que la web (marca a la izquierda, navegación del
 * archivo a la derecha) con una pestaña ocre que dice dónde estás: el blog.
 */
defined( 'ABSPATH' ) || exit;
$cat_nav = array(
	array( cat_archive( '' ), cat_t( 'nav.home' ) ),
	array( cat_archive( 'archive' ), cat_t( 'nav.archive' ) ),
	array( cat_archive( 'films' ), cat_t( 'nav.films' ) ),
	array( cat_archive( 'discover' ), cat_t( 'nav.discover' ) ),
);
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#FAFAFA">
	<script>
		// Tema guardado, ANTES de pintar (sin parpadeo). Mismo criterio que la
		// web: claro por defecto, oscuro solo si se eligió.
		try {
			if (localStorage.getItem('theme') === 'dark') {
				document.documentElement.setAttribute('data-theme', 'dark');
				document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0D0D0D');
			}
		} catch (e) {}
	</script>
	<link rel="icon" href="<?php echo esc_url( cat_archive( 'favicon.svg', 'es' ) ); ?>" type="image/svg+xml">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#contenido">Saltar al contenido</a>

<header class="site-header">
	<div class="frame bar">
		<div class="brand">
			<a class="home" href="<?php echo esc_url( cat_archive( '' ) ); ?>">
				<span class="title"><?php echo esc_html( cat_t( 'site.title' ) ); ?></span>
				<span class="label tagline"><?php echo esc_html( cat_t( 'site.tagline' ) ); ?></span>
			</a>
			<a class="section" href="<?php echo esc_url( cat_blog_home() ); ?>"><?php echo esc_html( cat_t( 'articles.short' ) ); ?></a>
		</div>

		<div class="controls">
			<nav class="nav-desktop" aria-label="Principal">
				<?php foreach ( $cat_nav as $item ) : ?>
					<a class="label" href="<?php echo esc_url( $item[0] ); ?>"><?php echo esc_html( $item[1] ); ?></a>
				<?php endforeach; ?>
			</nav>
			<?php cat_language_links(); ?>
			<button type="button" class="icon-btn" data-theme-toggle aria-label="<?php echo esc_attr( cat_t( 'theme.toggle' ) ); ?>" title="<?php echo esc_attr( cat_t( 'theme.toggle' ) ); ?>"><span data-icon aria-hidden="true">☾</span></button>
			<button type="button" class="icon-btn menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="menu-movil" aria-label="<?php echo esc_attr( cat_t( 'blog.menu' ) ); ?>"><span data-icon aria-hidden="true">☰</span></button>
		</div>
	</div>

	<nav id="menu-movil" class="nav-mobile" hidden aria-label="<?php echo esc_attr( cat_t( 'blog.menu' ) ); ?>">
		<?php foreach ( $cat_nav as $item ) : ?>
			<a class="label" href="<?php echo esc_url( $item[0] ); ?>"><?php echo esc_html( $item[1] ); ?></a>
		<?php endforeach; ?>
		<a class="label" href="<?php echo esc_url( cat_blog_home() ); ?>"><?php echo esc_html( cat_t( 'articles.short' ) ); ?></a>
		<?php if ( cat_languages() ) : ?>
			<div class="row"><span class="label"><?php echo esc_html( cat_t( 'lang.switch' ) ); ?></span><?php cat_language_links(); ?></div>
		<?php endif; ?>
	</nav>
</header>

<main id="contenido">
