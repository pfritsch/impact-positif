// Requirements
// -----------------------------------------------------------------------------
const gulp = require('gulp')

// Utils
const rename = require('gulp-rename')
const header = require('gulp-header')
const inject = require('gulp-inject')
const concat = require('gulp-concat')
const clean = require('gulp-clean')

// Template
const minifyHTML = require('gulp-minify-html')
const wiredep = require('wiredep').stream
const svgstore = require('gulp-svgstore')

// Images
const imagemin = require('gulp-imagemin')
const pngquant = require('imagemin-pngquant')

// Scripts
const jshint = require('gulp-jshint')
const stylish = require('jshint-stylish')
const uglify = require('gulp-uglify')

// Styles
const sass = require('gulp-sass')
const plumber = require('gulp-plumber')
const autoprefixer = require('gulp-autoprefixer')
const cleanCSS = require('gulp-clean-css')
const sourcemaps = require('gulp-sourcemaps')

// Doc
const hologram = require('gulp-hologram')

// Server
const browserSync = require('browser-sync')

// SEO
const sitemap = require('gulp-sitemap')

// Settings
// -----------------------------------------------------------------------------
var banner = [
  '/*!\n' +
  ' * <%= package.name %>\n' +
  ' * <%= package.title %>\n' +
  ' * <%= package.url %>\n' +
  ' * @author <%= package.author %>\n' +
  ' * @version <%= package.version %>\n' +
  ' * Copyright ' + new Date().getFullYear() + '. <%= package.license %> licensed.\n' +
  ' */',
  '\n'
].join('')

const src = './src/'
const dist = './app/'
const siteUrl = '<%= package.url %>'
const packages = require('./package.json')
const reload = browserSync.reload

// Gulp Tasks
// -----------------------------------------------------------------------------

// COPY
// Copy extra files like .htaccess, robots.txt
gulp.task('copy', function () {
  return gulp.src(['./.htaccess', './robots.txt'])
  .pipe(gulp.dest(dist))
})

// Copy fonts
gulp.task('fonts', function () {
  return gulp.src(src + 'assets/fonts/*')
    .pipe(gulp.dest(dist + 'assets/fonts/'))
})

// Copy docs
gulp.task('docs', function () {
  return gulp.src(src + 'assets/*')
    .pipe(gulp.dest(dist + 'assets/'))
})

// TEMPLATE
// Bower css and scripts inject +  SVG Sprite inject
gulp.task('template', function () {
  var svgs = gulp
    .src(src + 'assets/icons/*.svg')
    .pipe(imagemin({
      svgoPlugins: [{
        removeViewBox: false
      }]
    }))
    .pipe(rename({prefix: 'icon-'}))
    .pipe(svgstore({ inlineSvg: true }))
  function fileContents (filePath, file) {
    return file.contents.toString()
  }
  return gulp.src(src + '**/*.html')
    .pipe(wiredep({
      includeSelf: true
    }))
    .pipe(inject(svgs, { transform: fileContents }))
    .pipe(minifyHTML({
      conditionals: true,
      spare: true
    }))
    .pipe(gulp.dest(dist))
})

gulp.task('template-watch', ['template'], reload)

// IMAGES
// Optimization
gulp.task('images', function () {
  return gulp.src(src + 'assets/images/*')
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{
        removeViewBox: false
      }],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(dist + 'assets/images/'))
    .pipe(reload({
      stream: true
    }))
})

// SCRIPTS
// JSHint, Uglify
gulp.task('scripts', function () {
  return gulp.src([src + 'scripts/*.js'])
    .pipe(concat('main.min.js'))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(uglify())
    .pipe(gulp.dest(dist + 'scripts'))
    .pipe(reload({
      stream: true
    }))
})

// Bower components main scripts files
gulp.task('vendors', function () {
  var vendorsJS = require('wiredep')().js
  // vendorsJS.push('src/be.js/be.js')
  return gulp.src(vendorsJS)
    .pipe(concat('vendors.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(dist + 'scripts'))
})

// STYLES
// LibSass, Minified
gulp.task('styles', function () {
  return gulp.src(src + 'styles/{,*/}*.{scss,sass}')
    .pipe(sourcemaps.init())
    .pipe(wiredep())
    .pipe(plumber())
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(cleanCSS({compatibility: 'ie9'}))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(header(banner, {
      package: packages
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(dist + 'styles'))
    .pipe(reload({
      stream: true
    }))
})

// DOC
// Hologram: http://www.wearecube.ch/maintaining-living-style-guides-with-hologram/
gulp.task('doc', function () {
  return gulp.src('hologram_config.yml')
    .pipe(hologram())
    .pipe(reload({
      stream: true
    }))
})

// SEO
// Generate a Sitemap
gulp.task('sitemap', function () {
  return gulp.src(dist + '/*.html')
    .pipe(sitemap({
      siteUrl: siteUrl
    }))
    .pipe(gulp.dest(dist))
})

// CLEAN
// Generate a Sitemap
gulp.task('clean', function () {
  return gulp.src(dist)
    .pipe(clean())
})

// BUILD
gulp.task('build', ['copy', 'docs', 'fonts', 'vendors', 'template', 'images', 'scripts', 'styles'], reload)

// SERVER
// Browser Sync (wait build task to be done)
gulp.task('serve', ['build'], function () {
  browserSync({
    notify: false,
    server: {
      baseDir: dist,
      routes: { '/bower_components': 'bower_components' }
    }
  })
  gulp.watch(src + '**/*.{html,json,svg}', ['template-watch', 'copy'])
  gulp.watch(src + 'scripts/*.js', ['scripts'])
  gulp.watch(src + 'assets/images/*', ['images'])
  gulp.watch(src + 'styles/{,*/}*.{scss,sass}', ['styles', 'doc'])
  gulp.watch(src + 'styles/styleguide.md', ['doc'])
})

// Gulp Default Task
// -----------------------------------------------------------------------------
// Having watch within the task ensures that 'sass' has already ran before watching
gulp.task('default', ['build', 'doc', 'sitemap', 'serve'])
