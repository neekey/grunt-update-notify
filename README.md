# grunt-update-notify

Get the UPDATE for a particular npm module, and notify your user.

## How to use

Add the `update_notify` in front of your task list:

```js
grunt.registerTask( 'default', [ 'update_notify', 'copy' ] );
```

### Configs

- `name` The npm module name you want to check UPDATE
- `global` If this module is installed global
- `changeLogURL` URL where can get the change log
- `changeLog` A function specified to handle your change log, remember to return the result as the final log to show. You can get two params while running this function:
    - content: The raw content fetch via `changeLogURL`
    - latest: The latest version of your module
    - see example below:

```js
changeLog: function( content, latest ){
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
}
```

- `show` A function for you to log your UPDATE info as you like, You can get three params while running this function:
    - oldVersion: The old version of your module.
    - newVersion: The latest version of your module.
    - changeLog: The change log of your module's latest version.
- `interval` Indicate how often to check UPDATE, use `day` as unit.
- `append` Display the UPDATE notification at the end of all the grunt log
- `interrupt` If set `true`, all the tasks after will be cleared as soon as the UPDATE info is displayed.
- `block` A trigger for you to control whether check UPDATE or not.

## Example

```js
grunt.initConfig({

    update_notify: {
        generator: {
            options: {
                name: 'generator-kissy-cake',
                global: true,
                changeLogURL: 'https://raw.github.com/abc-team/generator-kissy-cake/master/CHANGELOG.md',
                changeLog: function( content, latest ){
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
                interval: 3,
                append: true
            }
        }
    }
});
```

Enjoy!