const view = new URLSearchParams(window.location.search).get("view") || "home";

switchView(`#${view}`);

function switchView(newView) {
    $("#view").children("div").hide();
    $(newView).show();

    $(`#nav_${view}`).addClass("active");
}