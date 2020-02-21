'use strict';

const path = require('path');
const sass = require('node-sass');
const fs = require('fs');
const uglifyify = require('uglifyify');

module.exports = function (grunt) {

    // collect dependencies from node_modules
    let nm = path.resolve(__dirname, 'node_modules'),
        vendorAliases = ['@clubajax/custom-elements-polyfill', '@clubajax/dom', '@clubajax/on', '@clubajax/base-component'],
        baseAliases = ['./src/date-picker'],
        allAliases = vendorAliases.concat(baseAliases),
        sourceMaps = 1,
        watch = false,
        watchPort = 35750,
        devBabel = 0,
        babelTransform = ['babelify', {
            global: true,
            presets: ['@babel/preset-env']
        }],
        uglifyTransform = [
            'uglifyify', {
                global: true
            }
        ],
        devTransform = devBabel ? [babelTransform] : [],
        buildTransform = [babelTransform, uglifyTransform];

    grunt.initConfig({

        browserify: {
            // source maps have to be inline.
            // grunt-exorcise promises to do this, but it seems overly complicated
            vendor: {
                // different convention than "dev" - this gets the external
                // modules to work properly
                // Note that vendor does not run through babel - not expecting
                // any transforms. If we were, that should either be built into
                // the app or be another vendor-type file
                src: ['.'],
                dest: 'tests/dist/vendor.js',
                options: {
                    // expose the modules
                    alias: vendorAliases.map(function (module) {
                        return module + ':';
                    }),
                    // not consuming any modules
                    external: null,
                    transform: devTransform,
                    browserifyOptions: {
                        debug: sourceMaps
                    }
                }
            },
            dev: {
                files: {
                    'tests/dist/output.js': ['tests/src/date-picker-tests.js']
                },
                options: {
                    // not using browserify-watch; it did not trigger a page reload
                    watch: false,
                    keepAlive: false,
                    external: vendorAliases,
                    alias: {
                        //'BaseComponent': './src/BaseComponent'
                    },
                    browserifyOptions: {
                        debug: sourceMaps
                    },
                    // transform not using babel in dev-mode.
                    // if developing in IE or using very new features,
                    // change devBabel to `true`
                    transform: devTransform,
                    postBundleCB: function (err, src, next) {
                        console.timeEnd('build');
                        next(err, src);
                    }
                }
            },
            DatePicker: {
                files: {
                    'dist/date-picker.js': ['src/date-picker.js']
                },
                options: {
                    external: [...vendorAliases],
                    transform: devTransform,
                    browserifyOptions: {
                        standalone: 'date-picker',
                        debug: false
                    }
                }
            },
            deploy: {
                files: {
                    'dist/date-picker.js': ['tests/src/date-picker-tests.js']
                },
                options: {
                    transform: buildTransform,
                    browserifyOptions: {
                        standalone: 'date-picker',
                        debug: false
                    }
                }
            }
        },

        sass: {
            deploy: {
                options: {
                    // case sensitive!
                    implementation: sass,
                    sourceMap: true
                },
                // 'path/to/result.css': 'path/to/source.scss'
                files: {
                    'dist/date-picker.css': 'src/date-picker.scss'
                }
            },
            dev: {
                options: {
                    // case sensitive!
                    implementation: sass,
                    sourceMap: true
                },
                // 'path/to/result.css': 'path/to/source.scss'
                files: {
                    'tests/dist/date-picker.css': 'src/date-picker.scss'
                }
            }
        },

        watch: {
            less: {
                files: ['./src/date-picker.scss'],
                tasks: ['sass'],
                options: {
                    // keep from refreshing the page
                    // the page does not care if a less file has changed
                    livereload: false
                }
            },
            // css module is needed for css reload
            // watch the main file. When it changes it will notify the page
            // the livereload.js file will check if this is CSS - and if so, reload
            // the stylesheet, and not the whole page
            css: {
                files: 'tests/dist/date-picker.css'
            },
            html: {
                files: ['tests/*.html'],
                tasks: []
            },
            scripts: {
                files: ['tests/src/*.js', 'src/*.js'],
                tasks: ['build-dev']
            },
            options: {
                livereload: watchPort
            }
        },

        'http-server': {
            main: {
                // where to serve from (root is least confusing)
                root: '.',
                // port (if you run several projects at once these should all be different)
                port: '8200',
                // host (0.0.0.0 is most versatile: it gives localhost, and it works over an Intranet)
                host: '0.0.0.0',
                cache: -1,
                showDir: true,
                autoIndex: true,
                ext: "html",
                runInBackground: false
                // route requests to another server:
                //proxy: dev.machine:80
            }
        },

        concurrent: {
            target: {
                tasks: ['watch', 'http-server'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        copy: {
            package: {
                files: [
                    {src: './src/package.json', dest: 'dist/package.json'}
                ]
            }
        }
    });

    // watch build task
    grunt.registerTask('build-dev', function (which) {
        console.time('build');
        grunt.task.run('sass');
        grunt.task.run('browserify:dev');

    });

    // task that builds vendor and dev files during development
    grunt.registerTask('build', function (which) {
        grunt.task.run('browserify:vendor');
        grunt.task.run('build-dev');
    });

    // The general task: builds, serves and watches
    grunt.registerTask('dev', function (which) {
        grunt.task.run('build');
        grunt.task.run('concurrent:target');
    });

    // alias for server
    grunt.registerTask('serve', function (which) {
        grunt.task.run('http-server');
    });

    grunt.registerTask('deploy', function (which) {
        grunt.task.run('version');
        grunt.task.run('browserify:deploy');
        grunt.task.run('sass:deploy');
        grunt.task.run('copy:package');
        // const compile = require('./scripts/compile');
        // compile('BaseComponent');
        // compile('properties');
        // compile('template');
        // compile('refs');
        // compile('item-template');
    });

    grunt.registerTask('version', function () {
        const buildPackage = JSON.parse(fs.readFileSync('./src/package.json').toString());
        const mainPackage = JSON.parse(fs.readFileSync('./package.json').toString());
        if (mainPackage.version !== buildPackage.version) {
            // has been manually updated
        } else {
            // increment main version
            const version = mainPackage.version.split('.');
            version[2] = parseInt(version[2], 10) + 1;
            mainPackage.version = version.join('.');
            console.log('package.version changed to:', mainPackage.version);
        }
        buildPackage.version = mainPackage.version;
        // copy over updated dependencies
        // buildPackage.dependencies = mainPackage.dependencies;
        fs.writeFileSync('./src/package.json', JSON.stringify(buildPackage, null, 2));
        fs.writeFileSync('./package.json', JSON.stringify(mainPackage, null, 2));
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-http-server');
};
