let count = 0;

$( document ).ready(function() {
  	var clipboard = new ClipboardJS('.discord-id-copy');


	$("#header-banner-name").click(function() {
		count++;
		if(count >= 10) {
			$("body").css({"background": "url('sources/img/noise.png'), #634242", "background-blend-mode": "luminosity"});

			$("#header-banner-name").html("wener");
			$("#header-banner-aliases").html("(Le Wenęůr, MrWener)");
		}
	});
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