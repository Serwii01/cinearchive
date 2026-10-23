<?php
/**
 * Un artículo, con la misma estructura que tenían en la web: antetítulo y
 * fecha, titular, entradilla, cifras, portada, texto, galería, películas
 * (que llevan a su ficha en el archivo), fuentes y más artículos.
 */
defined( 'ABSPATH' ) || exit;
get_header();

while ( have_posts() ) :
	the_post();
	$cat_a = cat_article( get_the_ID() );
	?>
	<article class="frame section-pad">
		<a class="label" href="<?php echo esc_url( cat_blog_home() ); ?>">← <?php echo esc_html( cat_t( 'articles.back' ) ); ?></a>

		<header class="article-head">
			<span class="label"><?php echo esc_html( trim( $cat_a['kicker'] . ' · ' . cat_date(), ' ·' ) ); ?></span>
			<h1><?php the_title(); ?></h1>
			<?php if ( $cat_a['lead'] ) : ?>
				<p class="lead"><?php echo esc_html( $cat_a['lead'] ); ?></p>
			<?php endif; ?>
			<p class="meta byline"><?php echo esc_html( cat_t( 'articles.by' ) ); ?></p>
		</header>

		<?php if ( $cat_a['stats'] ) : ?>
			<div class="stats">
				<?php foreach ( $cat_a['stats'] as $s ) : ?>
					<div><p class="v"><?php echo esc_html( $s['value'] ); ?></p><p class="meta l"><?php echo esc_html( $s['label'] ); ?></p></div>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>

		<?php if ( $cat_a['cover'] ) : ?>
			<figure class="cover"><img src="<?php echo esc_url( $cat_a['cover'] ); ?>" alt="" width="1280" height="720" decoding="async"></figure>
		<?php endif; ?>

		<div class="entry">
			<?php the_content(); ?>
		</div>

		<?php if ( $cat_a['gallery'] ) : ?>
			<section class="block">
				<h2 class="rule-title"><?php echo esc_html( cat_t( 'articles.gallery' ) ); ?></h2>
				<div class="posters">
					<?php foreach ( $cat_a['gallery'] as $g ) : ?>
						<?php $cat_tag = $g['url'] ? 'a' : 'figure'; ?>
						<<?php echo $cat_tag; ?> class="poster"<?php echo $g['url'] ? ' href="' . esc_url( $g['url'] ) . '"' : ''; ?>>
							<div class="pic">
								<?php if ( $g['poster'] ) : ?>
									<img src="<?php echo esc_url( $g['poster'] ); ?>" <?php echo $g['srcset'] ? 'srcset="' . esc_attr( $g['srcset'] ) . '" sizes="(min-width:640px) 25vw, 50vw"' : ''; ?> alt="" loading="lazy" decoding="async">
								<?php else : ?>
									<div class="film-grain"></div>
								<?php endif; ?>
							</div>
							<div class="txt">
								<p class="t"><?php echo esc_html( $g['title'] ); ?></p>
								<?php if ( $g['caption'] ) : ?><p class="meta c"><?php echo esc_html( $g['caption'] ); ?></p><?php endif; ?>
							</div>
						</<?php echo $cat_tag; ?>>
					<?php endforeach; ?>
				</div>
			</section>
		<?php endif; ?>

		<?php if ( $cat_a['related'] ) : ?>
			<section class="block">
				<h2 class="rule-title"><?php echo esc_html( cat_t( 'articles.related' ) ); ?></h2>
				<div class="posters">
					<?php foreach ( $cat_a['related'] as $f ) : ?>
						<a class="poster" href="<?php echo esc_url( $f['url'] ); ?>">
							<div class="pic">
								<?php if ( $f['poster'] ) : ?>
									<img src="<?php echo esc_url( $f['poster'] ); ?>" <?php echo $f['srcset'] ? 'srcset="' . esc_attr( $f['srcset'] ) . '" sizes="(min-width:640px) 25vw, 50vw"' : ''; ?> alt="" loading="lazy" decoding="async">
								<?php else : ?>
									<div class="film-grain"></div>
								<?php endif; ?>
							</div>
							<div class="txt">
								<p class="t"><?php echo esc_html( $f['title'] ); ?></p>
								<?php if ( $f['meta'] ) : ?><p class="meta"><?php echo esc_html( $f['meta'] ); ?></p><?php endif; ?>
							</div>
						</a>
					<?php endforeach; ?>
				</div>
			</section>
		<?php endif; ?>

		<?php
		$cat_otros = get_posts(
			array(
				'post_type'      => 'post',
				'posts_per_page' => 6,
				'post__not_in'   => array( get_the_ID() ),
				'lang'           => $cat_a['lang'],
				'no_found_rows'  => true,
			)
		);
		?>
		<?php if ( $cat_a['sources'] || $cat_otros ) : ?>
			<section class="foot-grid">
				<div>
					<?php if ( $cat_a['sources'] ) : ?>
						<h2 class="rule-title"><?php echo esc_html( cat_t( 'dossiers.sources' ) ); ?></h2>
						<ul class="sources">
							<?php foreach ( $cat_a['sources'] as $s ) : ?>
								<li><a href="<?php echo esc_url( $s['url'] ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $s['label'] ); ?> ↗</a></li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</div>
				<?php if ( $cat_otros ) : ?>
					<div>
						<h2 class="rule-title"><?php echo esc_html( cat_t( 'articles.more' ) ); ?></h2>
						<ul class="others">
							<?php foreach ( $cat_otros as $o ) : ?>
								<li><a href="<?php echo esc_url( get_permalink( $o ) ); ?>"><span class="label"><?php echo esc_html( cat_kicker( $o->ID ) ); ?></span><span class="t"><?php echo esc_html( get_the_title( $o ) ); ?></span></a></li>
							<?php endforeach; ?>
						</ul>
					</div>
				<?php endif; ?>
			</section>
		<?php endif; ?>

		<aside class="to-archive">
			<p><?php echo esc_html( cat_t( 'site.description' ) ); ?></p>
			<a class="btn" href="<?php echo esc_url( cat_archive( '' ) ); ?>"><?php echo esc_html( cat_t( 'blog.toArchive' ) ); ?> →</a>
		</aside>
	</article>
	<?php
endwhile;

get_footer();
