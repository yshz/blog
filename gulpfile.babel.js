'use strict'

import { src, dest, parallel, series, watch } from 'gulp'
import plugins      from 'gulp-load-plugins'
import del          from 'del'
import pkg          from './package.json'
import parallelize  from 'concurrent-transform'
import browser      from 'browser-sync'
import autoprefixer from 'autoprefixer'
import cssnano      from 'cssnano'
import critical     from 'critical'

// load plugins
const $ = plugins()

// handle errors
const onError = (error) => {
    $.util.log('')
    $.util.log($.util.colors.red('You fucked up:', error.message, 'on line' , error.lineNumber))
    $.util.log('')
    this.emit('end')
}

// 'development' is just default, production overrides are triggered
// by adding the production flag to the gulp command e.g. `gulp build --production`
const isProduction = ($.util.env.production === true ? true : false)

// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Terminal Banner
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

console.log("")
console.log($.util.colors.gray("   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>>>"))
console.log("")
console.log($.util.colors.cyan("      (o) Just what do you think you're doing,", process.env.USER, "?    "))
console.log("")
console.log($.util.colors.gray("   <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>>>>"))
console.log("")

// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Config
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// Port to use for the development server.
const PORT = 1337

// Browsers to target when prefixing CSS.
const COMPATIBILITY = ['last 2 versions', 'ie >= 10']

// paths
const SRC       = '_src',
      DIST      = '_site',
      S3BUCKET  = 'kremalicious.com',
      S3PATH    = '/',
      S3REGION  = 'eu-central-1'

// icons
const ICONS = {
    entypo: {
        src: SRC + '/_assets/icons/entypo/',
        dist: DIST + '/assets/img/',
        prefix: 'entypo-',
        icons: [
            'twitter', 'facebook', 'google+', 'magnifying-glass', 'rss', 'link', 'arrow-with-circle-down', 'forward', 'heart', 'info-with-circle', 'infinity', 'github', 'chevron-right', 'chevron-left', 'eye', 'bitcoin'
        ]
    }
}

const iconset = ICONS.entypo

// Iterate through the icon set array
iconset.icons.forEach(function(icon, i, icons) {
    icons[i] = iconset.src + icon + '.svg'
})

// SVG sprite
const SPRITE = {
    dest: DIST + '/assets/img/',
    mode: {
        symbol: {
            dest: './',
            sprite: 'sprite.svg'
        }
    }
}

// code banner
const BANNER = [
    '/**',
    ' ** <%= pkg.name %> v<%= pkg.version %>',
    ' ** <%= pkg.description %>',
    ' ** <%= pkg.homepage %>',
    ' **',
    ' ** <%= pkg.author.name %> <<%= pkg.author.email %>>',
    ' **',
    ' ** YOU EARNED THE GEEK ACHIEVEMENT ',
    ' ** FOR LOOKING AT MY SOURCE ',
    ' **',
    ' ** But because of all the minimizing and caching ',
    ' ** going on you better check out the code on ',
    ' ** github ',
    ' ** ',
    ' ** <%= pkg.repository.url %> ',
    ' **/',
    ''
].join('\n')


// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Tasks
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

//
// Delete build artifacts
//
export const clean = () =>
    del([
        DIST + '**/*',
        DIST + '.*', // delete all hidden files
        '!' + DIST + '/media'
    ])


//
// Jekyll
//
export const jekyll = (done) => {

    browser.notify('Compiling Jekyll')

    if (isProduction) {
        process.env.JEKYLL_ENV = 'production'
        var jekyll_options = 'jekyll build --lsi'
    } else {
        var jekyll_options = 'jekyll build --config _config.yml,_config.dev.yml --incremental --drafts --future'
    }

    let spawn  = require('child_process').spawn,
        jekyll = spawn('bundle', ['exec', jekyll_options], { stdio: 'inherit' })

    jekyll.on('error', (error) => onError() ).on('close', done)
}


//
// HTML
//
export const html = () => src(DIST + '/**/*.html')
    .pipe($.if(isProduction, $.htmlmin({
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        useShortDoctype: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        minifyJS: true,
        minifyCSS: true
    })))
    .pipe(dest(DIST))


//
// Styles
//
const processors = [
    autoprefixer({ browsers: COMPATIBILITY }),
    cssnano()
]

export const css = () =>
    src([
        SRC + '/_assets/styl/kremalicious3.styl',
        SRC + '/_assets/styl/post-*.styl'
    ])
    .pipe($.if(!isProduction, $.sourcemaps.init()))
    .pipe($.stylus({ 'include css': true })).on('error', onError)
    .pipe($.postcss(processors)).on('error', onError)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe($.if(isProduction, $.header(BANNER, { pkg: pkg })))
    .pipe($.rename({ suffix: '.min' }))
    .pipe(dest(DIST + '/assets/css/'))
    .pipe(browser.stream())

// inline critical-path CSS
export const criticalCss = (done) => {
    if (isProduction) {
        critical.generate({
            base: DIST,
            src: 'index.html',
            dest: 'index.html',
            inline: true,
            minify: true,
            dimensions: [{
                height: 320,
                width: 480
            }, {
                height: 600,
                width: 650
            }, {
                height: 700,
                width: 960
            }, {
                height: 900,
                width: 1400
            }]
        })
    }
    done()
}


//
// Scripts
//
const jsProject = () =>
    src([
        SRC + '/_assets/js/kremalicious3.js',
        'node_modules/picturefill/dist/picturefill.js'
    ])
    .pipe($.sourcemaps.init())
    .pipe($.include()).on('error', onError)
    .pipe($.if(isProduction, $.uglify())).on('error', onError)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe($.if(isProduction, $.header(BANNER, { pkg: pkg })))
    .pipe($.rename({suffix: '.min'}))
    .pipe(dest(DIST + '/assets/js/'))

// Service Worker js
const jsSW = () => src(DIST + '/service-worker.js')
    .pipe($.if(isProduction, $.uglify({ compress: { drop_console: true } }))).on('error', onError)
    .pipe(dest(DIST + '/'))

// Collect all script tasks
export const js = series(jsProject, jsSW)


//
// Icons
//
export const icons = () => src(iconset.icons)
    .pipe($.rename({ prefix: iconset.prefix }))
    .pipe(dest(iconset.dist))
    .pipe($.filter('**/*.svg'))
    .pipe($.if(isProduction, $.imagemin({ svgoPlugins: [{ removeViewBox: false }] })))
    .pipe($.svgSprite(SPRITE))
    .pipe(dest(iconset.dist))


//
// Images
//
export const images = () =>
    src([
        SRC + '/_assets/img/**/*',
        '!' + SRC + '/_assets/img/entypo'
    ])
    .pipe($.if(isProduction, $.imagemin({
        optimizationLevel: 5, // png
        progressive: true, // jpg
        interlaced: true, // gif
        multipass: true, // svg
        svgoPlugins: [{ removeViewBox: false }]
    })))
    .pipe(dest(DIST + '/assets/img/'))

// optimize Jekyll generated images
export const imagesGenerated = () => src(DIST + '/media/gen/**/*')
    .pipe($.if(isProduction, $.imagemin({
        optimizationLevel: 5, // png
        progressive: true, // jpg
        interlaced: true, // gif
        multipass: true, // svg
        svgoPlugins: [{ removeViewBox: false }]
    })))
    .pipe(dest(DIST + '/media/gen/'))


//
// Copy fonts
//
export const fonts = () => src(SRC + '/_assets/fonts/**/*')
    .pipe(dest(DIST + '/assets/fonts/'))


//
// Copy media
//
export const media = () => src(SRC + '/_media/**/*')
    .pipe(dest(DIST + '/media/'))


//
// Revision static assets
//
export const rev = (done) => {
    // globbing is slow so do everything conditionally for faster dev build
    if (isProduction) {
        return src(DIST + '/assets/**/*.{css,js,png,jpg,jpeg,svg,eot,ttf,woff,woff2}')
            .pipe($.rev())
            .pipe(dest(DIST + '/assets/'))
            // output rev manifest for next replace task
            .pipe($.rev.manifest())
            .pipe(dest(DIST + '/assets/'))
    }
    done()
}


//
// Replace all links to assets in files
// from a manifest file
//
export const revReplace = (done) => {
    // globbing is slow so do everything conditionally for faster dev build
    if (isProduction) {
        let manifest = src(DIST + '/assets/rev-manifest.json')

        return src(DIST + '/**/*.{html,css,js}')
            .pipe($.revReplace({ manifest: manifest }))
            .pipe(dest(DIST))
    }
    done()
}


//
// Dev Server
//
export const server = (done) => {
    browser.init({
        server: DIST,
        port: PORT,
        reloadDebounce: 2000
    })
    done()
}


//
// Watch for file changes
//
export const watchSrc = () => {
    watch(SRC + '/_assets/styl/**/*.styl').on('all', series(css))
    watch(SRC + '/_assets/js/**/*.js').on('all', series(js, browser.reload))
    watch(SRC + '/_assets/img/**/*.{png,jpg,jpeg,gif,webp}').on('all', series(images, browser.reload))
    watch(SRC + '/_assets/img/**/*.{svg}').on('all', series(icons, browser.reload))
    watch(SRC + '/_media/**/*').on('all', series(media, browser.reload))
    watch([SRC + '/**/*.{html,xml,json,txt,md,yml}', './*.yml', SRC + '_includes/svg/*']).on('all', series('build', browser.reload))
}


//
// Build banner
//
export const buildBanner = (done) => {
    console.log($.util.colors.gray("         ------------------------------------------"))
    console.log($.util.colors.green('                Building ' + ($.util.env.production ? 'production' : 'dev') + ' version...'))
    console.log($.util.colors.gray("         ------------------------------------------"))

    done()
}


// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Collection tasks
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

//
// Full build
//
// `gulp build` is the development build
// `gulp build --production` is the production build
//
export const build = series(buildBanner, clean, jekyll, parallel(html, css, js, images, imagesGenerated, icons, fonts, media), rev, revReplace, criticalCss)

//
// Build site, run server, and watch for file changes
//
// `gulp dev`
//
export const dev = series(build, server, watchSrc)

// Set `gulp dev` as default: `gulp`
export default dev


// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Deployment
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

// create publisher, define config
const publisher = $.awspublish.create({
    params: {
        'Bucket': S3BUCKET
    },
    'accessKeyId': process.env.AWS_ACCESS_KEY,
    'secretAccessKey': process.env.AWS_SECRET_KEY,
    'region': S3REGION
})

export const s3 = () => src(DIST + '/**/*')
    .pipe($.awspublishRouter({
        cache: {
            // cache for 5 minutes by default
            cacheTime: 300
        },
        routes: {
            // all static assets, cached & gzipped
            '^assets/(?:.+)\\.(?:js|css|png|jpg|jpeg|gif|ico|svg|ttf|eot|woff|woff2)$': {
                cacheTime: 2592000, // cache for 1 month
                gzip: true
            },

            // every other asset, cached
            '^assets/.+$': {
                cacheTime: 2592000  // cache for 1 month
            },

            // all html files, not cached & gzipped
            '^.+\\.html': {
                cacheTime: 0,
                gzip: true
            },

            // font mime types
            '\.ttf$': {
                key: '$&',
                headers: { 'Content-Type': 'application/x-font-ttf' }
            },
            '\.woff$': {
                key: '$&',
                headers: { 'Content-Type': 'application/x-font-woff' }
            },
            '\.woff2$': {
                key: '$&',
                headers: { 'Content-Type': 'application/x-font-woff2' }
            },

            // pass-through for anything that wasn't matched by routes above, to be uploaded with default options
            "^.+$": "$&"
        }
    }))
    // make sure everything goes to the root '/'
    .pipe($.rename(function (path) {
        path.dirname = S3PATH + path.dirname
    }))
    .pipe(parallelize(publisher.publish(), 100))
    .pipe(publisher.sync()) // delete files in bucket that are not in local folder
    .pipe($.awspublish.reporter({
        states: ['create', 'update', 'delete']
    }))

// `gulp deploy`
export const deploy = series(s3)
