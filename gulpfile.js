"use strict";

const {src, dest, parallel, series, watch} = require('gulp');
const sass = require('gulp-sass');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const panini = require('panini');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const del = require('del');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const uglify = require('gulp-uglify-es').default;
const tinyCompress = require('gulp-tinypng-compress');

/* Paths */
var path = {
    build: {
        html: "dist/",
        js: "dist/assets/js/",
        css: "dist/assets/css/",
        images: "dist/assets/img/",
        svg: "dist/assets/img/",
        fonts: "dist/assets/fonts/",
        resources: "dist/assets/resources",
    },
    src: {
        html: "src/*.html",
        js: "src/assets/js/main.js",
        css: "src/assets/scss/**/*.scss",
        images: "src/assets/img/**/*.{jpg,jpeg,png,svg,gif,ico,webmanifest,xml}",
        svg: "src/assets/img/svg/*.svg",
        fonts: "src/assets/fonts/**.ttf",
        resources: "src/assets/resources/**",
    },
    watch: {
        html: "src/**/*.html",
        js: "src/assets/js/**/*.js",
        css: "src/assets/scss/**/*.scss",
        images: "src/assets/img/**/*.{jpg,jpeg,png,svg,gif,ico,webmanifest,xml}",
        svg: "src/assets/img/svg/*.svg",
        fonts: "src/assets/fonts/**.ttf",
        resources: "src/assets/resources/**",
    },
    clean: "./dist"
};

/* Default */
const styles = () => {
    return src(path.src.css)
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError()))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(path.build.css))
        .pipe(browserSync.stream());
};

const html = () => {
    panini.refresh();
    return src(path.src.html, { base: "src/" })
        .pipe(panini({
            root: 'src/',
            layouts: 'src/tpl/layouts/',
            partials: 'src/tpl/partials/',
        }))
        .pipe(dest(path.build.html))
        .pipe(browserSync.stream());
};

const imgToDist = () => {
    return src(path.src.images)
        .pipe(dest(path.build.images));
};

const svgSprites = () => {
    return src(path.src.svg) 
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../sprite.svg"
                }
            }
        }))
        .pipe(dest(path.build.svg));
};

const resources = () => {
    return src(path.src.resources)
        .pipe(dest(path.build.resources));
};

const clean = () => {
    return del(path.clean);
};

const scripts = () => {
    return src(path.src.js)
        .pipe(webpackStream({
            mode: 'development',
            output: {
                filename: 'main.js'
            },
            module: {
                rules: [
                  {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                      loader: 'babel-loader',
                      options: {
                        presets: ['@babel/preset-env']
                      }
                    }
                  }
                ]
              }
        }))
        .on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
        .pipe(sourcemaps.init())
        .pipe(uglify().on("error", notify.onError()))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(path.build.js))
        .pipe(browserSync.stream());
};

const fonts = () => {
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts));
};

const checkWeight = (fontname) => {
    let weight = 400;
    switch (true) {
        case /Thin/.test(fontname):
            weight = 100;
            break;
        case /ExtraLight/.test(fontname):
            weight = 200;
            break;
        case /Light/.test(fontname):
            weight = 300;
            break;
        case /Regular/.test(fontname):
            weight = 400;
            break;
        case /Medium/.test(fontname):
            weight = 500;
            break;
        case /SemiBold/.test(fontname):
            weight = 600;
            break;
        case /Semi/.test(fontname):
            weight = 600;
            break;
        case /Bold/.test(fontname):
            weight = 700;
            break;
        case /ExtraBold/.test(fontname):
            weight = 800;
            break;
        case /Heavy/.test(fontname):
            weight = 700;
            break;
        case /Black/.test(fontname):
            weight = 900;
            break;
        default:
            weight = 400;
    }
    return weight;
};

const cb = () => {};

let srcFonts = './src/assets/scss/_fonts.scss',
    appFonts = './dist/assets/fonts/';

const fontsStyle = (done) => {
    let fileContent = fs.readFileSync(srcFonts);

    fs.writeFile(srcFonts, '', cb);
    fs.readdir(appFonts, function (err, items) {
        if (items) {
            let cFontname;
            for (var i = 0; i < items.length; i++) {
                let fontname = items[i].split('.');
                fontname = fontname[0];
                let font = fontname.split('-')[0];
                let weight = checkWeight(fontname);

                if (cFontname != fontname) {
                    fs.appendFile(srcFonts, '@include font-face("' + font + '", "' + fontname + '", ' + weight + ');\r\n', cb);
                }
                cFontname = fontname;
            }
        }
    });

    done();
};

const watchFiles = () => {
    browserSync.init({
        server: {
            baseDir: "./dist"
        },
        notify: false,
    });

    watch([path.watch.css], styles);
    watch([path.watch.html], html);
    watch([path.watch.images], imgToDist);
    watch([path.watch.svg], svgSprites);
    watch([path.watch.resources], resources);
    watch([path.watch.fonts], fonts);
    watch([path.watch.fonts], fontsStyle);
    watch([path.watch.js], scripts);
};

exports.styles = styles;
exports.watchFiles = watchFiles;
exports.html = html;
exports.scripts = scripts;
exports.fonts = fonts;
exports.fontsStyle = fontsStyle;

exports.default = series(clean, parallel(html, scripts, fonts, resources, imgToDist, svgSprites), fontsStyle, styles, watchFiles);

/* Build */
const tinypng = () => {
    return src([path.src.images])
        .pipe(tinyCompress({
            key: 'bmt7KdQ1WV4l8VglXKBGLh30mvDMwXqv',
            parallel: true,
            parallelMax: 75,
            log: true,
        }))
        .pipe(dest(path.build.images));
};

const stylesBuild = () => {
    return src(path.src.css)
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError()))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(dest(path.build.css));
};

const scriptsBuild = () => {
    return src(path.src.js)
        .pipe(webpackStream({
            mode: 'development',
            output: {
                filename: 'main.js'
            },
            module: {
                rules: [
                  {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                      loader: 'babel-loader',
                      options: {
                        presets: ['@babel/preset-env']
                      }
                    }
                  }
                ]
              }
        }))
        .on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
        .pipe(uglify().on("error", notify.onError()))
        .pipe(dest(path.build.js));
};

exports.build = series(clean, parallel(html, scriptsBuild, fonts, resources, imgToDist, svgSprites), fontsStyle, stylesBuild, tinypng);
