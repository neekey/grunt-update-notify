module.exports = function (grunt) {

    /**
     * 对每个具体任务进行配置
     */
    grunt.initConfig({

        update_notify: {
            generator: {
                options: {
                    name: 'generator-kissy-cake',
                    global: true,
                    changeLogURL: 'https://raw.github.com/abc-team/generator-kissy-cake/master/CHANGELOG.md',
                    changeLog: function( content, latest ){
                        // 对内容进行提取
                        var chunk = content.split( /#+\s*v?([\d\.]+)\s*\n/g );
                        var isVersion = true;
                        var lastVersion = null;
                        var changeLogs = {};
                        chunk.forEach(function( value ){
                            if( value = value.trim() ){
                                if( isVersion ){
                                    lastVersion = value;
                                }
                                else {
                                    changeLogs[ lastVersion ] = value;
                                }
                                isVersion = !isVersion;
                            }
                        });

                        return changeLogs[ latest ];
                    },
                    show: null,
                    interval: 3,
                    append: true,
                    interrupt: true,
                    block: false
                }
            }
        }
    });

    grunt.task.loadTasks( '../tasks' );

    grunt.registerTask( 'default', [ 'update_prompt'] );
};