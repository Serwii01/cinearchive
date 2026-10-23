<?php
/** Páginas sueltas (si se crea alguna): titular y texto, sin más. */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
	<article class="frame section-pad">
		<header class="article-head"><h1><?php the_title(); ?></h1></header>
		<div class="entry"><?php the_content(); ?></div>
	</article>
	<?php
endwhile;
get_footer();
