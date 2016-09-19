var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var del = require('del');
var webpack = require('webpack-stream')

var jsPaths = 'src/router.js';
var destJs = 'build/m.js';
var cssPath = 'src/m.css';
var cssAniPath = 'src/m.animate.css';

gulp.task('clean', function(cb) {
  del(['build'], cb);
});

gulp.task('scripts', ['clean'], function() {
  return gulp.src(jsPaths)
    .pipe(webpack({
      output: {
        filename: 'm.js',
        library: 'M',
        libraryTarget: 'umd'
      }
    }))
    .pipe(gulp.dest('build/'));
});

gulp.task('minscripts', ['scripts'], function() {
  return gulp.src(destJs)
    .pipe(concat('m.min.js'))
    .pipe(uglify({
      mangle: {
        except: ['require', 'exports', 'module']
      }
    }))
    .pipe(gulp.dest('build/'));
});

gulp.task('css', ['clean'], function() {
  return gulp.src(cssPath)
    .pipe(minifyCss())
    .pipe(gulp.dest('build/'));
});

gulp.task('cssAni', ['clean'], function() {
  return gulp.src(cssAniPath)
    .pipe(minifyCss())
    .pipe(gulp.dest('build/'));
});

gulp.task('default', ['minscripts', 'css', 'cssAni']);
