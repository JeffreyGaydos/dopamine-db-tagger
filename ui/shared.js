function SanitizeArtistName(raw) {
    let trimmed = raw.replaceAll(/^;|;$/g, "");
    let eachArtist = trimmed.split(";;");
    if(eachArtist.length === 1) {
        return trimmed;
    }
    if(eachArtist.length === 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(" ");
    }
    if(eachArtist.length > 2) {
        eachArtist[eachArtist.length - 1] = "and " + eachArtist[eachArtist.length - 1];
        return eachArtist.join(", ");
    }
}

function CreateTag(tagName, color, isArtist, enableHtml=false, additionalClass=undefined) {
    const tagElement = document.createElement("BUTTON");
    tagElement.classList.add("tag");
    if(additionalClass)
        tagElement.classList.add(additionalClass);
    tagElement.setAttribute("ev", tagName);
    tagElement.style.setProperty("--the-color", color);
    const redThreshold = parseInt("0xAA", 16);
    const greenThreshold = parseInt("0x55", 16);
    const blueThreshold = parseInt("0xFF", 16);
    const redInt = parseInt("0x" + color.substring(1, 3), 16);
    const greenInt = parseInt("0x" + color.substring(3, 5), 16);
    const blueInt = parseInt("0x" + color.substring(5), 16);
    tagElement.style.backgroundColor = "var(--the-color)"; // used for disabled color
    const textColor = (redInt > redThreshold || blueInt > blueThreshold || greenInt > greenThreshold) ? "black" : "white";
    tagElement.style.color = textColor;
    tagElement.style.setProperty("--the-text-color", textColor);
    if(isArtist) tagElement.classList.add("a");
    if(enableHtml) {
        tagElement.innerHTML = tagName;
    } else {
        tagElement.innerText = tagName;
    }
    return tagElement;
}

//How dopamine (typescript) stores dates:
function convertDateToTicks(date) {
    // The number of .net ticks at the unix epoch
    const epochTicks = 621355968000000000;

    // There are 10000 .net ticks per millisecond
    const ticksPerMillisecond = 10000;

    // Date in JavaScript also contains time zone offset. We need to remove it.
    const offsetInTicks = date.getTimezoneOffset() * 600000000;

    // Calculate the total number of .NET ticks for the given date
    const dotNetTicks = epochTicks + date.getTime() * ticksPerMillisecond - offsetInTicks;

    return dotNetTicks;
}

//Reversing the way dopamine (typescript) stores dates
//Verified against this code (same results): https://github.com/digimezzo/dopamine/blob/06753cb86a1db880ec42052ded3996c28c508307/src/app/common/date-time.ts#L29-L39
function convertTicksToDate(dotNetTicks) {
    // The number of .net ticks at the unix epoch
    const epochTicks = 621355968000000000;

    // There are 10000 .net ticks per millisecond
    const ticksPerMillisecond = 10000;

    let finalDate = new Date();
    const offsetInTicks = finalDate.getTimezoneOffset() * 600000000; //Assumes the timezone of the file matches the local timezone. But it's also not that deep imo

    const jsTicks = (dotNetTicks + offsetInTicks - epochTicks) / ticksPerMillisecond;

    finalDate.setTime(jsTicks);
    console.log(finalDate);

    return finalDate;
}

/*
( //NOTE Ignores all timezone offsets
    ( //Moving from .NET ticks to JS ticks; hard-coding the timezone offset
        (DateFileCreated - 621355968000000000) / 10000
    ) / 1000
    //Moving from JS ticks to UNIX EPOCH, which is parsable in SQLite
)
Hyper-simple:
To get a nicely formatted date from Dopamine's C# ticks:
DATETIME(((DateFileCreated - 621355968000000000) / 10000000), 'unixepoch')
To get a C# tick value from a nicely formatted string date:
CAST(STRFTIME('%s', '2018-04-07 11:33:55') AS INT) * 10000000 + 621355968000000000,
*/