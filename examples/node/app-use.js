require('../../namespace.js');
autoload({ 'app': __dirname + '/app' });
use(
    'app.App',
    function(App) {
        App.start()
    }
);