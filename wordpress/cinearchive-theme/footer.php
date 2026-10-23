<?php
/** Pie: el de la web, con los enlaces al archivo. */
defined( 'ABSPATH' ) || exit;
?>
</main>

<footer class="site-footer">
	<div class="frame">
		<div class="top">
			<div>
				<p class="name"><?php echo esc_html( cat_t( 'site.title' ) ); ?></p>
				<p class="label" style="margin-top:8px"><?php echo esc_html( cat_t( 'site.tagline' ) ); ?></p>
			</div>
			<p class="meta">© <?php echo esc_html( wp_date( 'Y' ) ); ?> <a href="<?php echo esc_url( cat_archive( 'sergio' ) ); ?>"><?php echo esc_html( cat_t( 'footer.rights' ) ); ?></a></p>
		</div>
		<nav aria-label="Pie">
			<a class="label" href="<?php echo esc_url( cat_archive( '' ) ); ?>"><?php echo esc_html( cat_t( 'nav.home' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'archive' ) ); ?>"><?php echo esc_html( cat_t( 'nav.archive' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'films' ) ); ?>"><?php echo esc_html( cat_t( 'nav.films' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'discover' ) ); ?>"><?php echo esc_html( cat_t( 'nav.discover' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'cinema' ) ); ?>"><?php echo esc_html( cat_t( 'nav.cinema' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_blog_home() ); ?>"><?php echo esc_html( cat_t( 'articles.short' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'about' ) ); ?>"><?php echo esc_html( cat_t( 'nav.about' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'info' ) ); ?>"><?php echo esc_html( cat_t( 'nav.info' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'privacy' ) ); ?>"><?php echo esc_html( cat_t( 'nav.privacy' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( cat_archive( 'terms' ) ); ?>"><?php echo esc_html( cat_t( 'nav.terms' ) ); ?></a>
			<a class="label" href="<?php echo esc_url( get_bloginfo( 'rss2_url' ) ); ?>">RSS</a>
		</nav>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
