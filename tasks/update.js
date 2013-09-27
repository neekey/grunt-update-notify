/*
 * Grunt-Multi: Run Grunt task with multi-configuration.
 */
var FS = require( 'fs' );
var Path = require( 'path' );
var URL = require( 'url' );
var Child = require( 'child_process' );
var HTTP = require( 'http' );
var HTTPS = require( 'https' );
var NPM = require( 'npm' );

module.exports = function (grunt) {

    grunt.registerMultiTask( 'update_notify', 'Get the UPDATE for a particular npm module, and notify your user.', function () {

        var done = this.async();

        // Get the raw `multi` config, in case the glob-patterns have been replaced by grunt automatically.
        var options = this.options();
        var moduleName = options.name;
        var changeLogURL = options.changeLogURL;
        var changeLog = options.changeLog;
        var global = options.global;
        var show = options.show;
        var interrupt = options.interrupt;
        var append = options.append;
        var interval = options.interval;
        var block = options.block;

        // Decide if run
        if( !block && Utils.isCheckTime(interval) ){

            // 获取当前版本
            Utils.getLatest( moduleName, global, function( err, ret ){

                if( err ){
                    done( err );
                }
                else {
                    if( ret.current != ret.latest ){

                        Utils.saveTimestamp();

                        if( changeLogURL ){
                            Utils.getChangeLog( changeLogURL, function( err, log ){
                                if( err ){
                                    done( err );
                                }
                                else {
                                    if( changeLog ){
                                        log = changeLog( log, ret.latest );
                                    }
                                    showPrompt( ret.current, ret.latest, log );
                                }
                            });
                        }
                        else {
                            showPrompt( ret.current, ret.latest );
                        }
                    }
                    else {
                        done(null);
                    }
                }
            });
        }
        else {
            done();
        }

        function showPrompt( oldV, newV, log ){

            if( append ){
                process.on( 'exit', function(){
                    if( show ){
                        show( oldV, newV, log );
                    }
                    else {
                        console.log( '\n\033[1;32m=======================================================\033[0m\n' );
                        console.log( '\tCurrent：\033[1;35m' + oldV + '\033[0m，available UPDATE \033[1;32m' + newV + '\033[0m :' );
                        console.log( '\t>>> \033[1;33mnpm update ' + moduleName + ( global ? ' -g' : '' ) + '\033[0m' );
                        if( log ){
                            console.log( '\n\tChangeLog\033[40;37m(' + newV + ')\033[0m：\n\t\t\033[40;37m' + log.replace( /\n/g, '\n\t\t' ) + '\033[0m' );
                        }
                        console.log( '\n\033[1;32m=======================================================\033[0m' );
                    }
                });
            }
            else {
                if( show ){
                    show( oldV, newV, log );
                }
                else {
                    console.log( '\n\033[1;32m=======================================================\033[0m\n' );
                    console.log( '\tCURRENT：\033[1;35m' + oldV + '\033[0m，available UPDATE \033[1;32m' + newV + '\033[0m :' );
                    console.log( '\t>>> \033[1;33mnpm update ' + moduleName + ( global ? ' -g' : '' ) + '\033[0m' );
                    if( log ){
                        console.log( '\n\tChangeLog\033[40;37m(' + newV + ')\033[0m：\n\t\t\033[40;37m' + log.replace( /\n/g, '\n\t\t' ) + '\033[0m' );
                    }
                    console.log( '\n\033[1;32m=======================================================\033[0m' );
                }

                if( interrupt ){
                    grunt.task.clearQueue();
                }
            }

            done();
        }
    });

    var TIMESTAMP_PATH = Path.resolve( __dirname, '../.check_timestamp' );

    var Utils = {

        /**
         * 获取最新的generator，并在grunt任务执行完毕之后执行
         * @param type
         * @param global
         * @param next
         */
        getLatest: function( type, global, next ){

            this.getCurrentVersion( type, global, function( err, v ){

                if( err ){
                    grunt.log.fail( 'ERROR when getting CURRENT version: ', err, arguments[ 1 ], arguments[ 2 ]);
                    next( err );
                }
                else {

                    if( !v ){
                        grunt.log.fail( 'ERROR when getting CURRENT version, make sure you have install it：\033[1;33m' + type  + '\033[0m' );
                        next( 'ERROR when getting CURRENT version, make sure you have install it：\033[1;33m' + type  + '\033[0m' );
                    }
                    else {
                        var options = {
                            hostname: 'registry.npmjs.org',
                            port: 80,
                            path: '/' + type + '?t=' + Date.now(),
                            method: 'GET'
                        };

                        var DATA = '';
                        var latestVersion;
                        var currentVersion = v;

                        var req = HTTP.request(options, function(res) {
                            res.setEncoding('utf8');
                            res.on('data', function (chunk) {
                                DATA += chunk;
                            });

                            res.on( 'end', function(){

                                var r;
                                try {
                                    r = JSON.parse(DATA);
                                } catch(ex) {
                                    r = {};
                                    grunt.log.fail( 'ERROR when getting LATEST version.' );
                                    next( ex );
                                    return;
                                }

                                latestVersion = r[ 'dist-tags' ].latest;

                                next( null, {
                                    current: currentVersion,
                                    latest: latestVersion
                                });
                            });
                        });

                        req.end();
                    }
                }
            });
        },

        /**
         * 获取指定版本的changelog
         * 该功能暂时针对github设计，主要思路是读取仓库中的CHANGELOG.md文件，内容格式必须为：
         *      https://raw.github.com/abc-team/generator-kissy-cake/master/CHANGELOG.md
         * @param repoURL github仓库地址
         * @param version 需要读取的版本号
         * @param done 回调
         */
        getChangeLog: function( changelogURL, done ){

            var repoInfo = URL.parse( changelogURL );
            var protocol = repoInfo.protocol;
            var request = protocol == 'http' ? HTTP : HTTPS;

            request.get( changelogURL + '?t=' + Date.now(), function(res) {

                var DATA = '';
                res.setEncoding('utf8');

                res.on('data', function (chunk) {
                    DATA += chunk;
                });

                res.on( 'end', function(){
                    done( null, DATA );
                });

            }).on('error', function(e) {
                    done( e );
                });
        },

        /**
         * 获取当前的版本
         * @param pkg
         * @param done
         */
        getCurrentVersion: function( pkg, global, done ){

            NPM.load({ "global": true }, function( err ){

                if( err ){
                    next( err );
                }
                else {
                    // 给定第二个参数，组织npm输出
                    NPM.commands.ls( [ pkg ], true, function( warnings, infos ){

                        if( warnings ){
                            done( warnings );
                        }
                        else {
                            if( infos.dependencies[ pkg ] ){
                                done( null, infos.dependencies[ pkg ].version )
                            }
                            else {
                                done( null );
                            }
                        }
                    });
                }
            });
        },

        saveTimestamp: function( timestamp ){

            if( !timestamp ){
                timestamp = Date.now();
            }

            FS.writeFileSync( TIMESTAMP_PATH, timestamp );
        },

        isCheckTime: function( interval ){

            // Be sure that TIMESTAMP_PATH is exist.
            if( FS.existsSync( TIMESTAMP_PATH ) ){
                var prevTimestamp = parseInt( FS.readFileSync( TIMESTAMP_PATH ).toString().replace( /\n/, '' ) );
                var curTimestamp = Date.now();
                return curTimestamp - prevTimestamp >= interval * 24 * 60 * 60 * 1000;
            }
            else {
                return true;
            }
        }
    };
};


