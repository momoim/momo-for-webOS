function RecorderAssistant(){
    this.TAG = 'RecorderAssistant';
	this.fileExtension = '.amr';
}

RecorderAssistant.prototype = {
    setup: function(){
		Mojo.Log.info(this.TAG, 'setup.');
		
		this.captureHelper = new CaptureHelper();
		this.onClickReal = this.onClick.bind(this);
		this.recording = false;
    },
	onClick: function(e) {
		Mojo.Log.info(this.TAG, 'onclick stop========-.');
		
		if (this.recording) {
			this.captureHelper.stopRecording();
		} else {
			this.captureHelper.startRecording(guidGenerator(), function (response) {
				Mojo.Log.info(this.TAG, 'startAudioCapture.');
			});
		}
		this.recording = !this.recording;
	},
    activate: function(event){
		this.controller.document.addEventListener("click", this.onClickReal, true);
    },
    deactivate: function(event){
		this.controller.document.removeEventListener("click", this.onClickReal, true);
    },
    cleanup: function(event){
    }
};
