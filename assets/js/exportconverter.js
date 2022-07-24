// Stolen from https://stackoverflow.com/questions/48788722 😁

function ObjToXML(obj) {
    var xml = '';
    for (var prop in obj) {
        xml += obj[prop] instanceof Array ? '' : "<" + prop + ">";
        if (obj[prop] instanceof Array) {
            for (var array in obj[prop]) {
                xml += "<" + prop + ">";
                xml += ObjToXML(new Object(obj[prop][array]));
                xml += "</" + prop + ">";
            }
        } else if (typeof obj[prop] == "object") {
            xml += ObjToXML(new Object(obj[prop]));
        } else {
            xml += obj[prop];
        }
        xml += obj[prop] instanceof Array ? '' : "</" + prop + ">";
    }
    var xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
    return xml
}

// This is by me though 😎

function DBToCSV(db) {
    var tables = [];

    db.tables.forEach(x => {
        let csv = "";

        csv += x.cols.toString();
        if (x.rows && x.rows.length > 0 && x.rows[0].id && x.cols.indexOf("id") == -1) csv += ",id";
        csv += "\n";
        x.rows?.forEach(x => {
            csv += Object.values(x);
            csv += "\n";
        });

        tables.push({
            "name": x.name,
            "data": csv,
            "schema": JSON.stringify(x.schema)
        });
    });

    return tables;
}