console.log("I'm ready");

// make this thing work for clicks to somthing less annoying, maybe just clicks to the sidebar
$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});