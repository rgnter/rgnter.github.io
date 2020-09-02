$( document ).ready(function() {
  	var clipboard = new ClipboardJS('.discord-id-copy');
});

function showContact() {
	$('#contact').css({'display': 'block','animation-name': 'pulse'});
}

function showAlert(title) {
	$('#alert').css({'display': 'block', 'animation-name': 'bounceIn'});
	$('#alert').find('.content').html(title);

	setTimeout(hideAlert, 2000);
}

function hideAlert() {
	$('#alert').css({'animation-name': 'bounceOut'});
	setTimeout(function() {$('#alert').css({'display': ''});}, 900);
}