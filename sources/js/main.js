let count = 0;
let pressed = [];

$( document ).ready(function() {
  	var clipboard = new ClipboardJS('.discord-id-copy');

  	pressed = new Array();
	$("#header-banner-name").click(function() {
		count++;
		if(count >= 10) {
			$("body").css({"background": "url('sources/img/noise.png'), #634242", "background-blend-mode": "luminosity"});

			$("#header-banner-name").html("wener");
			$("#header-banner-aliases").html("(Le Wenęůr, MrWener)");
		}
	});
	$("body").keypress(function(event) {
		pressed.push(event.which);
		if(pressed.join('') == "102114101110100108121") {
			$("body").css({"background": "url('sources/img/noise.png')", "background-blend-mode": "screen", "background-color": "#101500"});
		}
	});
});


function show_contact() {
	$('#contact').css({'display': 'block','animation-name': 'pulse'});
}

function showAlert(title) {
	$('#alert').css({'display': 'block', 'animation-name': 'bounceIn'});
	$('#alert').find('.content').html(title);

	setTimeout(hideAlert, 4000);
}

function hideAlert() {
	$('#alert').css({'animation-name': 'bounceOut'});
	setTimeout(function() {$('#alert').css({'display': ''});}, 900);
}

$(window).on('load', function(){
	setTimeout(function() {
		$("header").fadeIn(500);
		$("header").removeClass("hidden");
	}, 1000); //wait for page load PLUS two seconds.
});