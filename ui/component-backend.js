function TrackIframeLoad() {
    document.querySelectorAll("iframe").forEach(f => {
        var componentContent = f.contentWindow.document.querySelector("[component]").innerHTML;
        f.outerHTML = componentContent;
    });
}
