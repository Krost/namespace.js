namespace('app.App', use('app.Config', 'app.Page'), function(Config, Page) {
    console.log(Config.path);
    console.log(Page.name);
    
    return {
        config: Config,
        page:   Page,
        start:  function() {
            console.log('Application start!');
        }
    }
});