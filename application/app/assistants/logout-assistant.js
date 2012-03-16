function LogoutAssistant () {}

LogoutAssistant.prototype = {
    setup: function() {
        var appMenu = [
            Mojo.Menu.editItem,
            {
                label: '推出',
            }
        ];
    }
}
