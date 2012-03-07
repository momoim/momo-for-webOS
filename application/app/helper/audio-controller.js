var AudioController = {
	TAG: 'AudioController',
    play: function(url){
		Mojo.Log.info(AudioController.TAG, 'play: ' + url);
        var audio = new Audio();
        audio.src = url;
		audio.load();
        audio.play();
    }
};
