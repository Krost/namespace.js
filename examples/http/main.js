autoload({ 'app': 'media/js/app' });

use('app.components.Component', function(Component) {
    var comp = new Component();
    console.log(comp.data);
    console.log(comp.path);
});