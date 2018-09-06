import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { Link, graphql } from 'gatsby'
import Layout from '../components/Layout'
import Image from '../components/atoms/Image'
import PostTitle from '../components/atoms/PostTitle'
import PostLead from '../components/atoms/PostLead'
import PostContent from '../components/atoms/PostContent'
import PostMore from '../components/atoms/PostMore'
import PostLinkActions from '../components/atoms/PostLinkActions'
import Pagination from '../components/molecules/Pagination'
import postStyles from '../templates/Post.module.scss'
import styles from './Posts.module.scss'

const IndexPage = ({ data, location, pageContext }) => {
  const edges = data.allMarkdownRemark.edges

  const Posts = edges.map(({ node }) => {
    const { type, linkurl, title, image } = node.frontmatter
    const { slug } = node.fields

    return (
      <article className={postStyles.hentry} key={node.id}>
        <PostTitle type={type} slug={slug} linkurl={linkurl} title={title} />

        {image && (
          <figure className={styles.hentry__image}>
            <Link to={slug}>
              <Image fluid={image.childImageSharp.fluid} alt={title} />
            </Link>
          </figure>
        )}

        <PostLead post={node} />

        {type === 'post' && <PostMore to={slug}>Continue Reading</PostMore>}

        {type === 'link' && (
          <Fragment>
            <PostContent post={node} />
            <PostLinkActions slug={slug} linkurl={linkurl} />
          </Fragment>
        )}
      </article>
    )
  })

  return (
    <Layout location={location}>
      {Posts}
      <Pagination pageContext={pageContext} />
    </Layout>
  )
}

IndexPage.propTypes = {
  data: PropTypes.object.isRequired,
  pageContext: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired
}

export default IndexPage

export const indexQuery = graphql`
  query($skip: Int!, $limit: Int!) {
    allMarkdownRemark(
      sort: { order: DESC, fields: [fields___date] }
      skip: $skip
      limit: $limit
    ) {
      edges {
        node {
          id
          html
          excerpt(pruneLength: 250)
          frontmatter {
            title
            type
            linkurl
            image {
              childImageSharp {
                ...ImageFluid
              }
            }
          }
          fields {
            slug
            date(formatString: "MMMM DD, YYYY")
          }
        }
      }
    }
  }
`
