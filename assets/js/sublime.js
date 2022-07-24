$.ajaxSetup({ timeout: 3000 });

const localData = {
    add: newObj => {
        if (!localStorage["databases"]) localStorage["databases"] = "[]";

        let oldDB = localData.read();
        newObj.id = oldDB.length;
        oldDB.push(newObj);

        oldDB.sort((x, y) => x.id > y.id ? 1 : -1);

        localStorage["databases"] = JSON.stringify(oldDB);
    },
    replace: (oldId, newObj) => {
        if (!localStorage["databases"]) localStorage["databases"] = "[]";

        let oldDB = localData.read();
        oldDB.splice(oldId, 1);
        newObj.id = oldId;
        oldDB.push(newObj);

        oldDB.sort((x, y) => x.id > y.id ? 1 : -1);

        localStorage["databases"] = JSON.stringify(oldDB);
    },
    read: () => {
        if (!localStorage["databases"]) localStorage["databases"] = "[]";

        return JSON.parse(localStorage["databases"]);
    },
    getSelected: () => {
        return localData.read().find(x => x.id == selected);
    }
}

const limelight = url => {
    if (url.indexOf("http://") == 0 || url.indexOf("https://") == 0) url.replace(/https?:\/\//, "http://");
    if (url.indexOf("http://") == -1 && url.indexOf("https://") == -1) url = `http://${url}`;

    return {
        info: async () => (await $.post(`${url}/admin`, "type=info")),
        login: async key => (await $.post(`${url}/admin`, `type=login&key=${key}`)),
        export: async key => (await $.post(`${url}/admin`, `type=export&key=${key}`)),
        read: async key => (await $.post(`${url}/admin`, `type=read&key=${key}`)),

        query: {
            alter: async (key, table, changes) => (await $.post(`${url}/query`, `type=alter&table=${table}&changes=${JSON.stringify(changes)}&key=${key}`)),
            select: async (key, table, filter, limit) => (await $.post(`${url}/query`, `type=select&table=${table}&filter=${filter.toString()}${limit ? `&limit=${limit}` : ""}&key=${key}`)),
            create: async (key, table, cols, schema, autoId) => (await $.post(`${url}/query`, `type=create&table=${table}&cols=${JSON.stringify(cols)}&schema=${encodeURIComponent(JSON.stringify(schema))}${autoId ? `&autoId=${autoId}` : ""}&key=${key}`)),
            insert: async (key, table, rows) => (await $.post(`${url}/query`, `type=insert&table=${table}&rows=${JSON.stringify(rows)}&key=${key}`)),
            update: async (key, table, filter, row) => (await $.post(`${url}/query`, `type=update&table=${table}&filter=${filter.toString()}&row=${JSON.stringify(row)}&key=${key}`)),
            delete: async (key, table, filter) => (await $.post(`${url}/query`, `type=delete&table=${table}&filter=${filter.toString()}&key=${key}`))
        }
    }
}

let selected = new URLSearchParams(window.location.search).get("db");
if ((selected && !localData.getSelected()) || (selected && localData.getSelected().deleted)) window.location.replace("?view=home");
if (!selected && $(`#nav_${view}`).hasClass("db-dependent")) window.location.replace("?view=home");

// Home

function loadDBs() {
    $("#home_dblist").empty();

    const dblist = localData.read();

    if (dblist.length == 0 || !selected) {
        $("#home_dashboard_nodatabase").html("Select or connect to a database below to access Sublime.");

        $(".db-dependent").removeClass("text-white");
        $(".db-dependent").addClass("text-secondary disabled");
    } else {
        $(".db-dependent").addClass("text-white");
    }

    dblist.filter(x => x).forEach(async x => {
        if (x.deleted) return;

        $("#home_dblist").append(`<li><a id="dblist_${x.id}" class="dropdown-item db-checkup ${x.id == selected ? "active" : ""}" href="?view=${view}&db=${x.id}">${x.nick} <i id="dblist_mark_${x.id}"><div class="spinner-border spinner-border-sm" role="status"></div></i></a></li>`);
        $("#home_dblistseparator").show();
    });

    $(".db-checkup").each(async (i, x) => {
        x = localData.read().find(y => y.id == x.id.split("_")[1]);

        if (await testConnection(x.url, x.password)) {
            $(`#dblist_mark_${x.id}`).addClass("bi bi-check-lg");

            const oldObj = localData.read().find(y => y.id == x.id);
            oldObj.connected = true;

            localData.replace(x.id, oldObj);
        } else {
            $(`#dblist_mark_${x.id}`).addClass("bi bi-x-lg");

            const oldObj = localData.read().find(y => y.id == x.id);
            oldObj.connected = false;

            localData.replace(x.id, oldObj);

            if (!localData.getSelected().connected && $(`#nav_${view}`).hasClass("connection-dependent")) window.location.replace(`?view=home&db=${selected}`);

            if (!localData.getSelected().connected) $(".connection-dependent").addClass("text-secondary disabled");
        }

        $(`#dblist_mark_${x.id}`).html("");
    });

    $(".db-link").each((i, x) => {
        if (selected) x.href += `&db=${selected}`;
    });
}

loadDBs();

// AddDB

$("#addDB_input_submit").click(async () => {
    if (!$("#addDB_input_url").val() || !$("#addDB_input_password").val()) return;

    if (localStorage["databases"] && localData.read().find(x => x.url == $("#addDB_input_url").val())) {
        // $("#addDB_connerror").html("You already added this database to Sublime.");
        // $("#addDB_connerror_popup").show();
        window.location.replace(`?view=home&db=${localData.read().find(x => x.url == $("#addDB_input_url").val()).id}`);
        return;
    }

    $("#addDB_input_submit").attr("disabled", true);

    switch (await testConnection($("#addDB_input_url").val(), $("#addDB_input_password").val())) {
        case true:
            localData.add({
                url: $("#addDB_input_url").val(),
                password: $("#addDB_input_password").val(),
                nick: $("#addDB_input_nickname").val() ? $("#addDB_input_nickname").val() : $("#addDB_input_url").val()
            });

            window.location.replace(`?view=home&db=${localData.read().find(x => x.url == $("#addDB_input_url").val()).id}`);

            break;
        case false:
            $("#addDB_connerror").html("Incorrect password.");
            $("#addDB_connerror_popup").show();

            $("#addDB_input_submit").attr("disabled", false);

            break;
        default:
            $("#addDB_connerror").html("The database provided is unreachable. Make sure it is publically accessible (outside of localhost) and try again.");
            $("#addDB_connerror_popup").show();
    
            $("#addDB_input_submit").attr("disabled", false);
    }
});

async function testConnection(url, password) {
    try {
        if ((await limelight(url).login(password)).success) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return null;
    }
}

// Dashboard

if (view == "dashboard") {
    if (!localData.getSelected().connected) {
        $("#dashboard_import").attr("disabled", true);
        $("#dashboard_export").attr("disabled", true);
        $("#dashboard_export_type").attr("disabled", true);
        
        $("#dashboard_isConnected").css("color", "red");
        $("#dashboard_isConnected").html("The selected database isn't connected!");
    }

    $("#dashboard_db_nick").html(`Settings for "${localData.getSelected().nick}"`);

    $("#dashboard_dburl").attr("placeholder", localData.getSelected().url);
    $("#dashboard_dbnick").attr("placeholder", localData.getSelected().nick);
    (async () => {
        switch (await testConnection(localData.getSelected().url, localData.getSelected().password)) {
            case true:
                $("#dashboard_isPasswordValid").css("color", "lime"); // Lime 😏
                $("#dashboard_isPasswordValid").html("Password is valid :)");

                break;
            case false:
                $("#dashboard_isPasswordValid").css("color", "red");
                $("#dashboard_isPasswordValid").html("Password is invalid and must be updated!");

                $("#dashboard_dbpassword").attr("required", true);

                break;
            default:
                $("#dashboard_isPasswordValid").html("Database is not connected :(");
        }
    })()
}

$("#dashboard_editdb_submit").click(async () => {
    $("#dashboard_editdb_submit").attr("disabled", true);
    $("#dashboard_editdb_spinner").show();

    const oldObj = localData.getSelected();

    if ((!$("#dashboard_dburl").val() || oldObj.url == $("#dashboard_dburl").val()) && (!$("#dashboard_dbnick").val() || oldObj.nick == $("#dashboard_dbnick").val()) && (!$("#dashboard_dbpassword").val() || oldObj.password == $("#dashboard_dbpassword").val())) {
        $("#dashboard_editdb_submit").attr("disabled", false);
        $("#dashboard_editdb_spinner").hide();
        return $("#dashboard_editdb_error").html("You didn't change anything, you silly! 😝");
    }

    if ($("#dashboard_dburl").val() && $("#dashboard_dburl").val() != oldObj.url) oldObj.url = $("#dashboard_dburl").val();
    if ($("#dashboard_dbnick").val() && $("#dashboard_dbnick").val() != oldObj.nick) oldObj.nick = $("#dashboard_dbnick").val();
    if ($("#dashboard_dbpassword").val() && $("#dashboard_dbpassword").val() != oldObj.password) oldObj.password = $("#dashboard_dbpassword").val();

    if (!(await testConnection(oldObj.url, oldObj.password))) {
        $("#dashboard_editdb_submit").attr("disabled", false);
        $("#dashboard_editdb_spinner").hide();
        return $("#dashboard_editdb_error").html("Cannot connect to database (nothing was updated).");
    }

    localData.replace(oldObj.id, oldObj);

    window.location.reload();
});

$("#dashboard_export").click(async () => {
    $("#dashboard_export").attr("disabled", true);
    $("#dashboard_export_spinner").show();

    const exported = await limelight(localData.getSelected().url).export(localData.getSelected().password);

    switch ($("#dashboard_export_type").val().split(",")[0]) {
        case "json":
            saveAs(new Blob([JSON.stringify(exported, null, $("#dashboard_export_type").val().split(",")[1] == "y" ? 2 : 0)], { type: "application/json;charset=utf-8" }), `${(await limelight(localData.getSelected().url).info()).response.name}.json`);
            break;
        case "xml":
            saveAs(new Blob([ObjToXML(exported)], { type: "application/xml;charset=utf-8" }), `${(await limelight(localData.getSelected().url).info()).response.name}.xml`);
            break;
        case "csv":
            const tables = DBToCSV(exported);
            const zip = new JSZip();

            tables.forEach(x => {
                let folder = zip.folder(x.name);
                folder.file("data.csv", x.data);
                folder.file("schema.json", x.schema);
            });

            zip.generateAsync({ type: "blob" })
            .then(async content => saveAs(content, `${(await limelight(localData.getSelected().url).info()).response.name}.zip`))

            break;
        case "html":
            break;
    }

    $("#dashboard_export").attr("disabled", false);
    $("#dashboard_export_spinner").hide();
});

$("#dashboard_rmdb").click(() => {
    if ($("#dashboard_rmdb").hasClass("confirm-delete")) {
        const oldObj = localData.getSelected();
        oldObj.url = oldObj.password = oldObj.nick = null;
        oldObj.deleted = true;
        localData.replace(oldObj.id, oldObj);

        window.location.replace("?view=home");
    } else {
        $("#dashboard_rmdb").html("Are you sure?");
        $("#dashboard_rmdb").addClass("confirm-delete");
    }
});

// Browse

if (view == "browse") {
    (async () => {
        const { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;

        const template = table => `<div class="accordion-item">
    <h2 class="accordion-header" id="browse_tables_heading_${table.name.split(' ')[0]}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#browse_tables_collapse_${table.name.split(' ')[0]}" aria-controls="browse_tables_collapse_${table.name.split(' ')[0]}">
            ${table.name}
        </button>
    </h2>
    <div id="browse_tables_collapse_${table.name.split(' ')[0]}" class="accordion-collapse collapse" aria-labelledby="browse_tables_heading_${table.name.split(' ')[0]}" data-bs-parent="#browse_tables">
        <div class="accordion-body">
            <table class="table table-hover table-striped">
                <thead class="table-light" style="position: sticky; top: 0;">
                    <tr>
                        ${table.autoId && table.cols.indexOf("id") == -1 ? "<th scope='col'>ID</th>" : ""}
                        ${table.cols.sort().map(col => `<th scope="col">${col}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${
                        table.rows ? table.rows.map(row => `<tr>${
                            Object.keys(row).sort().map(x => x == "id" ? `<th scope="row">${row[x]}</th>` : `<td>${row[x]}</td>`).join("")
                        }</tr>`).join("") : ""
                    }
                </tbody>
            </table>
        </div>
    </div>
</div>`;

        tables ? tables.forEach(table => {
            $("#browse_tables").append(template(table));
        }) : ""
    })();
}

// Query

let currentQuery = "";

if (view == "query") {
    $(".query_input_table_select").each(async (i, x) => {
        const { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;
    
        if (tables) tables.forEach(table => x.append($("<option></option>").attr("val", table.name).html(table.name)[0]));
        else {
            $("#query_btn_alter").attr("disabled", true);
            $("#query_btn_select").attr("disabled", true);
            $("#query_btn_insert").attr("disabled", true);
            $("#query_btn_update").attr("disabled", true);
            $("#query_btn_delete").attr("disabled", true);

            $("#query_btn_create").click();
        }
    
        $(`#${x.id}`).on("change", () => {
            $(`#${x.id}_default`).remove();
    
            if (x.id.indexOf("alter") != -1) query_alter_get_table();
            if (x.id.indexOf("insert") != -1) query_insert_get_table();
            if (x.id.indexOf("update") != -1) query_update_get_table();
    
            $(`.query_table-dependent_${x.id.split("query_input_table_select_")[1]}`).each((i, x) => $(x).attr("disabled", false));
            $("#query_execute").attr("disabled", false);
        });
    });
}

$(".query_filter").each((i, x) => $(x).html(`(x =>
    // Your code here
    // IMPORTANT: This code will be executed on your server, so be careful of what you put in
)`));

$(".query_table-dependent").attr("disabled", true);

$(".query_input").each((i, x) => $(x).hide());

$("#query_btn_group input").click(e => {
    if (currentQuery == e.target.id.split("query_btn_")[1]) return;
    else currentQuery = e.target.id.split("query_btn_")[1];

    $("#query_response").hide();

    if (currentQuery == "delete") $("#query_execute").attr("class", "btn btn-danger mb-4");
    else $("#query_execute").attr("class", "btn btn-primary mb-4");

    $(".query_input").each((i, x) => {
        if (e.target.id.split("query_btn_")[1] == x.id.split("query_")[1]) $(x).show();
        else $(x).hide();

        $("#query_execute").show();
        if (!$(`#query_input_table_select_${currentQuery}`).val()) $("#query_execute").attr("disabled", true);
        else $("#query_execute").attr("disabled", false);
    });
});

$("#query_execute").click(async () => {
    $("#query_execute").attr("disabled", true);
    $("#query_execute_spinner").show();
    $("#query_response").hide();
    $("#query_response").html();

    switch (currentQuery) {
        case "alter":
            $("#query_alter_columns").children("div.input-group").each((i, x) => {
                $(x).children("input").each((j, y) => {
                    if (!$(y).val()) {
                        $(y).addClass("bg-danger");
                        setTimeout(() => $(x).remove(), 500);
                    }
                });
            });

            setTimeout(async () => {
                let cols = [];
                let schema = {};
            
                $("#query_alter_columns").children("div.input-group").each((i, x) => {
                    cols.push($($(x).children("input")[0]).val());
                    schema[$($(x).children("input")[0]).val()] = { type: $($(x).children("select")[0]).val() };
                });

                if (new Set(cols).size != cols.length) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Duplicate columns.</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }
    
                if (!cols.length || !Object.keys(schema).length) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Invalid data provided.</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }

                var query = await limelight(localData.getSelected().url).query.alter(localData.getSelected().password, $("#query_input_table_select_alter").val(), { schema, autoId: $("#query_alter_autoid")[0].checked });
                $("#query_response").show();
                $("#query_execute").attr("disabled", false);
                $("#query_execute_spinner").hide();

                $("#query_response").html(`<div class="alert alert-${query.success ? "success" : "danger"}" role="alert">${query.success ? "Successfully altered table!" : `Alteration failed with this error: ${query.code}`}</div>`);

                if (query.success) {
                    setTimeout(() => window.location.reload(), 500);
                }
            }, 500);

            break;
        case "select":
            var query = await limelight(localData.getSelected().url).query.select(localData.getSelected().password, $("#query_input_table_select_select").val(), $("#query_select_filter").val(), $("#query_select_limit").val());
            $("#query_response").show();
            $("#query_response").addClass("accordion");
            $("#query_execute").attr("disabled", false);
            $("#query_execute_spinner").hide();
            
            const template = (table, rows) => `<div class="accordion-item">
    <h2 class="accordion-header" id="query_response_heading">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#query_response_collapse" aria-controls="query_response_collapse">
            Response
        </button>
    </h2>
    <div id="query_response_collapse" class="accordion-collapse collapse show" aria-labelledby="query_response_heading" data-bs-parent="#query_response">
        <div class="accordion-body">
            <table class="table table-hover table-striped">
                <thead class="table-light" style="position: sticky; top: 0;">
                    <tr>
                        ${table.autoId && table.cols.indexOf("id") == -1 ? "<th scope='col'>ID</th>" : ""}
                        ${table.cols.sort().map(col => `<th scope="col">${col}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${
                        rows.map(row => `<tr>${
                            Object.keys(row).sort().map(x => x == "id" ? `<th scope="row">${row[x]}</th>` : `<td>${row[x]}</td>`).join("")
                        }</tr>`).join("")
                    }
                </tbody>
            </table>
        </div>
    </div>                          
</div>`;

            var { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;
            
            $("#query_response").html(template(tables.find(x => x.name == $("#query_input_table_select_select").val()), query.response));
            $("#query_response").show();

            break;
        case "create":
            $("#query_create_columns").children("div.input-group").each((i, x) => {
                $(x).children("input").each((j, y) => {
                    if (!$(y).val()) {
                        $(y).addClass("bg-danger");
                        setTimeout(() => $(x).remove(), 500);
                    }
                });
            });

            setTimeout(async () => {
                let cols = [];
                let schema = {};
            
                $("#query_create_columns").children("div.input-group").each((i, x) => {
                    cols.push($($(x).children("input")[0]).val());
                    schema[$($(x).children("input")[0]).val()] = { type: $($(x).children("select")[0]).val() };
                });
                
                var { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;

                if (tables?.find(x => x.name == $("#query_create_table_name").val())) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Table name is already taken.</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }

                if (new Set(cols).size != cols.length) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Duplicate columns.</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }
    
                if (!$("#query_create_table_name").val() || !cols.length || !Object.keys(schema).length) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Invalid data provided.</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }

                var query = await limelight(localData.getSelected().url).query.create(localData.getSelected().password, $("#query_create_table_name").val(), cols, schema, $("#query_create_autoid")[0].checked);
                $("#query_response").show();
                $("#query_execute").attr("disabled", false);
                $("#query_execute_spinner").hide();

                $("#query_response").html(`<div class="alert alert-${query.success ? "success" : "danger"}" role="alert">${query.success ? "Successfully created table!" : `Creation failed with this error: ${query.code}`}</div>`);

                if (query.success) {
                    setTimeout(() => window.location.reload(), 500);
                }
            }, 500);

            break;
        case "insert":
            var row = {};

            $("#query_insert_columns").children().each((i, x) => {
                if ($(x).hasClass("input-group") && !$($(x).children("input")[0]).val()) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Column is empty</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }

                if ($(x).hasClass("input-group")) row[$(x).children("input")[0].id.split("query_insert_")[1]] = $($(x).children("input")[0]).val();
                if ($(x).hasClass("form-check")) row[$(x).children("input")[0].id.split("query_insert_")[1]] = $($($(x).children("input")[0]))[0].checked;
            });

            var query = await limelight(localData.getSelected().url).query.insert(localData.getSelected().password, $("#query_input_table_select_insert").val(), [ row ]);
            $("#query_response").show();
            $("#query_execute").attr("disabled", false);
            $("#query_execute_spinner").hide();

            $("#query_response").html(`<div class="alert alert-${query.success ? "success" : "danger"}" role="alert">${query.success ? "Successfully inserted row to table!" : `Insertion failed with this error: ${query.code}`}</div>`);

            if (query.success) {
                setTimeout(() => window.location.reload(), 500);
            }

            break;
        case "update":
            var row = {};

            $("#query_update_columns").children().each((i, x) => {
                if ($(x).hasClass("input-group") && !$($(x).children("input")[0]).val()) {
                    $("#query_response").html("<div class='alert alert-danger' role='alert'>Column is empty</div>");
                    $("#query_response").show();
                    $("#query_execute").attr("disabled", false);
                    $("#query_execute_spinner").hide();
                    return;
                }

                if ($(x).hasClass("input-group")) row[$(x).children("input")[0].id.split("query_update_")[1]] = $($(x).children("input")[0]).val();
                if ($(x).hasClass("form-check")) row[$(x).children("input")[0].id.split("query_update_")[1]] = $($($(x).children("input")[0]))[0].checked;
            });

            var query = await limelight(localData.getSelected().url).query.update(localData.getSelected().password, $("#query_input_table_select_update").val(), $("#query_update_filter").val(), row);
            $("#query_response").show();
            $("#query_execute").attr("disabled", false);
            $("#query_execute_spinner").hide();

            $("#query_response").html(`<div class="alert alert-${query.success ? "success" : "danger"}" role="alert">${query.success ? "Successfully updated row in table!" : `Update failed with this error: ${query.code}`}</div>`);

            if (query.success) {
                setTimeout(() => window.location.reload(), 500);
            }

            break;
        case "delete":
            var query = await limelight(localData.getSelected().url).query.delete(localData.getSelected().password, $("#query_input_table_select_delete").val(), $("#query_delete_filter").val());
            $("#query_response").show();
            $("#query_execute").attr("disabled", false);
            $("#query_execute_spinner").hide();
            
            $("#query_response").html(`<div class="alert alert-${query.success ? "success" : "danger"}" role="alert">${query.success ? "Successfully deleted row(s) from table!" : `Deletion failed with this error: ${query.code}`}</div>`);
            $("#query_response").show();

            break;
    }
});

// Query (alter)

async function query_alter_get_table() {
    var { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;
    
    $("#query_alter_columns").children("div.input-group").each((i, x) => $(x).remove());

    const selectedTable = tables.find(x => x.name == $("#query_input_table_select_alter").val());

    if (selectedTable.autoId) delete selectedTable.schema.properties["id"];

    Object.keys(selectedTable.schema.properties).sort().forEach(x => $("#query_alter_columns").insertAt(-2, `<div class="input-group mb-3"><input type="text" class="form-control" placeholder="Column Name..." value="${x}" required><select class="form-select"><option value="string"${selectedTable.schema.properties[x].type == "string" ? " selected" : ""}>string</option><option value="number"${selectedTable.schema.properties[x].type == "number" ? " selected" : ""}>number</option><option value="boolean"${selectedTable.schema.properties[x].type == "boolean" ? " selected" : ""}>boolean</option></select><button class="btn btn-danger" onclick="query_alter_column_delete(this)"><i class="bi bi-trash"></i></button></div>`));

    $("#query_alter_autoid").attr("checked", selectedTable.autoId);

    $(".query_alter_table-dependent").attr("disabled", false);
}

const query_alter_column_delete = e => $(e).parent().remove();

$("#query_alter_add_column").click(() => {
    $("#query_alter_columns").children("div.input-group").each((i, x) => {
        $(x).children("input").each((j, y) => {
            if (!$(y).val()) {
                $(y).addClass("bg-danger");
                setTimeout(() => $(x).remove(), 500);
            }
        });
    });

    $("#query_alter_columns").insertAt(-2, `<div class="input-group mb-3"><input type="text" id="query_alter_column_current" class="form-control" placeholder="Column Name..." required><select class="form-select"><option value="string" selected>string</option><option value="number">number</option><option value="boolean">boolean</option></select><button class="btn btn-danger" onclick="query_alter_column_delete(this)"><i class="bi bi-trash"></i></button></div>`);
    $("#query_alter_column_current").focus();
    $("#query_alter_column_current").attr("id", "");
});

// Query (create)

$("#query_create_table_name").on("input", () => $("#query_execute").attr("disabled", false));

const query_create_column_delete = e => $(e).parent().remove();

$("#query_create_add_column").click(() => {
    $("#query_create_columns").children("div.input-group").each((i, x) => {
        $(x).children("input").each((j, y) => {
            if (!$(y).val()) {
                $(y).addClass("bg-danger");
                setTimeout(() => $(x).remove(), 500);
            }
        });
    });

    $("#query_create_columns").insertAt(-2, `<div class="input-group mb-3"><input type="text" id="query_create_column_current" class="form-control" placeholder="Column Name..." required><select class="form-select"><option value="string" selected>string</option><option value="number">number</option><option value="boolean">boolean</option></select><button class="btn btn-danger" onclick="query_create_column_delete(this)"><i class="bi bi-trash"></i></button></div>`);
    $("#query_create_column_current").focus();
    $("#query_create_column_current").attr("id", "");
});

// Query (insert)

async function query_insert_get_table() {
    var { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;

    $("#query_insert_columns").empty();

    const selectedTable = tables.find(x => x.name == $("#query_input_table_select_insert").val());

    if (selectedTable.autoId) delete selectedTable.schema.properties["id"];

    Object.keys(selectedTable.schema.properties).sort().forEach(x => $("#query_insert_columns").append(selectedTable.schema.properties[x].type == "boolean" ? `<div class="form-check"><input type="checkbox" id="query_insert_${x}" class="form-check-input"><label class="form-control-label" for="query_insert_${x}">${x} <span style="color: #ff2825">*</span></label></div>` : `<div class="input-group"><span class="input-group-text">${x} <span style="color: #ff2825">*</span></span><input type="${selectedTable.schema.properties[x].type == "string" ? "text" : selectedTable.schema.properties[x].type == "number" ? "number" : selectedTable.schema.properties[x].type}" id="query_insert_${x}" class="form-control"></div>`));
}

// Query (update)

async function query_update_get_table() {
    var { tables } = (await limelight(localData.getSelected().url).read(localData.getSelected().password)).response;

    $("#query_update_columns").empty();

    const selectedTable = tables.find(x => x.name == $("#query_input_table_select_update").val());

    if (selectedTable.autoId) delete selectedTable.schema.properties["id"];

    Object.keys(selectedTable.schema.properties).sort().forEach(x => $("#query_update_columns").append(selectedTable.schema.properties[x].type == "boolean" ? `<div class="form-check"><input type="checkbox" id="query_update_${x}" class="form-check-input"><label class="form-control-label" for="query_update_${x}">${x} <span style="color: #ff2825">*</span></label></div>` : `<div class="input-group"><span class="input-group-text">${x} <span style="color: #ff2825">*</span></span><input type="${selectedTable.schema.properties[x].type == "string" ? "text" : selectedTable.schema.properties[x].type == "number" ? "number" : selectedTable.schema.properties[x].type}" id="query_update_${x}" class="form-control"></div>`));
}

// Random function I don't know where to put lmao

jQuery.fn.insertAt = function(index, element) {
    // https://stackoverflow.com/questions/3562493/jquery-insert-div-as-certain-index

    var lastIndex = this.children().length;
    if (index < 0) {
        index = Math.max(0, lastIndex + 1 + index);
    }
    this.append(element);
    if (index < lastIndex) {
        this.children().eq(index).before(this.children().last());
    }
    return this;
}