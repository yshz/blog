import React from 'react'
import PropTypes from 'prop-types'
import Time from 'react-time'
import slugify from 'slugify'
import PostLinkActions from '../atoms/PostLinkActions'
import styles from './PostMeta.module.scss'

const PostMeta = ({ post, meta }) => {
  const { author, updated, category, tags, type, linkurl } = post.frontmatter
  const { date, slug } = post.fields

  return (
    <footer className={styles.entryMeta}>
      {type === 'link' && <PostLinkActions slug={slug} linkurl={linkurl} />}

      <div className={styles.byline}>
        <span className={styles.by}>by</span>
        <a className="fn" rel="author" href={meta.author.uri}>
          {author || meta.author.name}
        </a>
      </div>

      <div className={styles.time}>
        <Time value={new Date(date)} titleFormat="YYYY/MM/DD HH:mm" relative />

        {updated && (
          <Time
            value={new Date(updated)}
            titleFormat="YYYY/MM/DD HH:mm"
            relative
          />
        )}
      </div>

      {category && (
        <div className={styles.categories}>
          <a className={styles.category} href={`/${slugify(category)}/`}>
            {category}
          </a>
        </div>
      )}

      {tags && (
        <div className={styles.tags}>
          {tags.map(tag => (
            <a key={tag} className={styles.tag} href={`/tag/${slugify(tag)}/`}>
              {tag}
            </a>
          ))}
        </div>
      )}
    </footer>
  )
}

PostMeta.propTypes = {
  post: PropTypes.object.isRequired,
  meta: PropTypes.object.isRequired
}

export default PostMeta
