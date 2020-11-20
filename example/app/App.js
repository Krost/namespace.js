namespace('app.App', use('app.Config', 'app.Page', 'app.Define'), function(Config, Page, Define) {
    console.log('Config: ', Config);
    console.log('Page:   ', Page);
    console.log('Define: ', Define);
    return {
        config: Config,
        page:   Page,
        start:  function() {
            console.log('Application start!');
        }
    }
});