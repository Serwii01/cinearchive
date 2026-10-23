<?php
/**
 * Portada del blog, búsquedas y categorías: el listado de artículos con el
 * aspecto de /articles en la web. El más reciente va a lo ancho.
 */
defined( 'ABSPATH' ) || exit;
get_header();

$cat_paged = max( 1, (int) get_query_var( 'paged' ) );
$cat_total = (int) $GLOBALS['wp_query']->found_posts;

if ( is_search() ) {
	$cat_title = cat_t( 'blog.results' );
	$cat_kick  = cat_t( 'search.title' ) . ' · ' . get_search_query();
	$cat_intro = '';
} elseif ( is_category() || is_tag() || is_author() || is_date() ) {
	$cat_title = wp_strip_all_tags( get_the_archive_title() );
	$cat_kick  = cat_t( 'articles.short' ) . ' · ' . $cat_total;
	$cat_intro = wp_strip_all_tags( get_the_archive_description() );
} else {
	$cat_title = cat_t( 'articles.title' );
	$cat_kick  = cat_t( 'articles.short' ) . ' · ' . $cat_total;
	$cat_intro = cat_t( 'articles.intro' );
}
?>
<section class="frame section-pad">
	<a class="label" href="<?php echo esc_url( cat_archive( '' ) ); ?>">← <?php echo esc_html( cat_t( 'blog.toArchive' ) ); ?></a>
	<header class="page-head">
		<span class="label"><?php echo esc_html( $cat_kick ); ?></span>
		<h1><?php echo esc_html( $cat_title ); ?></h1>
		<?php if ( $cat_intro ) : ?>
			<p class="intro"><?php echo esc_html( $cat_intro ); ?></p>
		<?php endif; ?>
		<form class="search-form" role="search" method="get" action="<?php echo esc_url( cat_blog_home() ); ?>">
			<label class="screen-reader-text" for="buscar"><?php echo esc_html( cat_t( 'search.title' ) ); ?></label>
			<input id="buscar" type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php echo esc_attr( cat_t( 'blog.searchPlaceholder' ) ); ?>">
			<button class="btn" type="submit"><?php echo esc_html( cat_t( 'search.title' ) ); ?></button>
		</form>
	</header>

	<?php if ( have_posts() ) : ?>
		<div class="grid-cards">
			<?php
			$cat_i = 0;
			while ( have_posts() ) :
				the_post();
				$cat_lead_card = 0 === $cat_i && 1 === $cat_paged && ! is_search();
				$cat_img       = cat_card_image( get_the_ID() );
				$cat_k         = cat_kicker( get_the_ID() );
				?>
				<a class="card<?php echo $cat_lead_card ? ' is-lead' : ''; ?>" href="<?php the_permalink(); ?>">
					<?php if ( $cat_img ) : ?>
						<div class="img"><img src="<?php echo esc_url( $cat_img ); ?>" alt="" loading="<?php echo $cat_i < 2 ? 'eager' : 'lazy'; ?>" decoding="async"></div>
					<?php endif; ?>
					<div class="body">
						<span class="label"><?php echo esc_html( trim( $cat_k . ' · ' . cat_date(), ' ·' ) ); ?></span>
						<h2><?php the_title(); ?></h2>
						<p class="lead"><?php echo esc_html( cat_lead( get_the_ID() ) ); ?></p>
						<span class="label more"><?php echo esc_html( cat_t( 'articles.read' ) ); ?> →</span>
					</div>
				</a>
				<?php
				++$cat_i;
			endwhile;
			// El primero ocupa la fila entera: si los demás son impares, queda un
			// hueco al final que se rellena para que la retícula no se rompa.
			$cat_rest = ( 1 === $cat_paged && ! is_search() ) ? $cat_i - 1 : $cat_i;
			if ( $cat_rest % 2 === 1 ) :
				?>
				<div class="filler" aria-hidden="true"></div>
			<?php endif; ?>
		</div>

		<nav class="pager label">
			<span><?php previous_posts_link( '← ' . esc_html( cat_t( 'blog.newer' ) ) ); ?></span>
			<span><?php next_posts_link( esc_html( cat_t( 'blog.older' ) ) . ' →' ); ?></span>
		</nav>
	<?php else : ?>
		<p class="empty"><?php echo esc_html( cat_t( 'blog.empty' ) ); ?></p>
	<?php endif; ?>
</section>
<?php
get_footer();
