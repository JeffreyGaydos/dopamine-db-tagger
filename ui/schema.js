function GetSchema() {
    const query = "SELECT * FROM sqlite_schema WHERE type = 'table'";
    const limit = 1000;
    return new Promise((resolve) => {
        fetch(`http://localhost:8080/api/query/raw/${encodeURIComponent(query)}/${limit}`).then((f) => {
            f.json().then(r => {
                if(r.error) {
                    alert("Could not query the database schema: " + r.error);
                } else if(r.limited === undefined) {
                    alert("Could not connect to the database. Check your configs in the <a href='./setup.html'>Setup Page</a>.");
                }
                resolve(r?.results ?? []);
            }, (e) => {
                alert(e);
                resolve([]);
            })
        }, (e) => {
            alert(e);
            resolve([]);
        });
    });
}

const tableObjects = [];

function SchemaSQLToTableObjects(createTableSQL) {
    let linesSpaces = createTableSQL.split("\n");
    let lines = [];
    linesSpaces.forEach(l => {
        lines.push(...l.split(","));
    });
    const tableRegex = new RegExp(/(?<=CREATE TABLE\s)[^\s]+/gm);
    
    const tableName = tableRegex.exec(lines[0]);
    if(!tableName) {
        console.error("Couldn't find the table name in the given SQL, skipping.")
        return;
    }

    const tableObject = {
        name: tableName[0],
        columns: [],
        rawSql: createTableSQL
    };

    lines.forEach((line, i) => {
        if(i > 0) {
            const columnKeywords = new RegExp(/[^\s,]+/gm);
            let keyword = null;
            const column = {};
            let index = 0;
            let nextPartHasPK = false;
            let nextPartHasDefaultValue = false;
            let nextPartHasForeignKey = false;
            let nextPartHasForeignKeyReference = false;
            do {
                keyword = columnKeywords.exec(line);
                if(keyword && keyword[0] != ")" && keyword[0] != "(") {
                    if(index === 0 && keyword[0] != "FOREIGN" && keyword[0] != "PRIMARY") {
                        column.name = keyword[0];
                    }
                    if(index === 1) {
                        if(keyword[0].includes("VARCHAR")) {
                            column.type = keyword[0].replaceAll("))", ")").replace("((", "(");
                        } else {
                            column.type = keyword[0].replaceAll(")", "").replaceAll("(", "");
                        }
                    }
                    if(index === 2 && keyword[0] == "PRIMARY") { //Trailling PK syntax
                        column.primaryKey = true;
                    }
                    if(nextPartHasPK) {
                        nextPartHasPK = false;
                        const PKRegex = new RegExp(/(?<=KEY\()[^\s\)]+(?=\))/);
                        const primaryKey = PKRegex.exec(keyword[0]);
                        if(tableObject.columns.filter(c => c.name == primaryKey[0])) {
                            tableObject.columns.filter(c => c.name == primaryKey[0])[0].primaryKey = true;
                        }
                    }
                    if(index == 0 && keyword[0] == "PRIMARY") { //Leading PK syntax
                        nextPartHasPK = true;
                    }
                    if(keyword[0] == "AUTOINCREMENT") {
                        column.autoincrement = true;
                    }
                    if(nextPartHasDefaultValue) {
                        column.default = keyword[0];
                    }
                    if(keyword[0] == "DEFAULT") {
                        nextPartHasDefaultValue = true;
                    }
                    if(nextPartHasForeignKey) {
                        nextPartHasForeignKey = false;
                        const FKRegex = new RegExp(/(?<=KEY\()[^\s\)]+(?=\))/);
                        const foreignKey = FKRegex.exec(keyword[0]);
                        if(tableObject.columns.filter(c => c.name == foreignKey[0])) {
                            tableObject.columns.filter(c => c.name == foreignKey[0])[0].foreignKey = true;
                        }
                    }
                    if(keyword[0] == "FOREIGN") {
                        nextPartHasForeignKey = true;
                    }
                    if(nextPartHasForeignKeyReference) {
                        nextPartHasForeignKeyReference = false;
                        const referenceRegex = new RegExp(/[^\s\(]+(?=\()/);
                        const foreignKeyReference = referenceRegex.exec(keyword[0]);
                        if(tableObject.columns.filter(c => c.foreignKey)) {
                            tableObject.columns.filter(c => c.foreignKey)[0].foreignKeyReference = foreignKeyReference[0];
                        }
                    }
                    if(keyword[0] == "REFERENCES") {
                        nextPartHasForeignKeyReference = true;
                    }
                }
                index++;
            } while(keyword != null);
            
            if(!column.primaryKey) {
                column.primaryKey = false;
            }
            if(!column.autoincrement) {
                column.autoincrement = false;
            }

            if(column.name) {
                tableObject.columns.push(column);
            }
        }
    });
    tableObjects.push(tableObject);
}

function RenderTableObject(tableObject) {
    const details = document.createElement("DETAILS");
    details.style.paddingLeft = "20px";
    const summary = document.createElement("SUMMARY");
    summary.innerText = tableObject?.name;
    const unorderedList = document.createElement("UL");
    tableObject.columns.forEach(c => {
        const list = document.createElement("LI");
        list.innerHTML = `${c.name} <span style="color: blue">${c.type}</span>${(c?.primaryKey ?? false === true ? ` <span title="Primary Key Column"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key-fill" viewBox="0 0 16 16">
  <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
</svg></span>` : "")}${c?.autoincrement ?? false === true ? ` <span title="Auto Increment Column"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-node-plus" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M11 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M6.025 7.5a5 5 0 1 1 0 1H4A1.5 1.5 0 0 1 2.5 10h-1A1.5 1.5 0 0 1 0 8.5v-1A1.5 1.5 0 0 1 1.5 6h1A1.5 1.5 0 0 1 4 7.5zM11 5a.5.5 0 0 1 .5.5v2h2a.5.5 0 0 1 0 1h-2v2a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2A.5.5 0 0 1 11 5M1.5 7a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>
</svg></span>` : ""}${c?.default ?? false === true ? ` <span title="Default value: ${c.default}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box" viewBox="0 0 16 16">
  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
</svg></span>` : ""}${c?.foreignKey ?? false === true ? ` <span title="Foreign Key Column: References '${c.foreignKeyReference}'"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key" viewBox="0 0 16 16">
  <path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8m4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5"/>
  <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
</svg></span>` : ""}`;
        unorderedList.appendChild(list);
    });
    const rawSqlDetails = document.createElement("DETAILS");
    const rawSqlSummary = document.createElement("SUMMARY");
    rawSqlSummary.innerText = "Show raw SQL";
    const rawSqlP = document.createElement("P");
    rawSqlP.innerText = tableObject.rawSql;
    rawSqlDetails.appendChild(rawSqlSummary);
    rawSqlDetails.appendChild(rawSqlP);
    rawSqlDetails.style.paddingLeft = "20px";
    rawSqlDetails.style.paddingBottom = "20px";
    rawSqlP.style.paddingLeft = "20px";

    details.appendChild(summary);
    details.appendChild(unorderedList);
    details.appendChild(rawSqlDetails);

    document.querySelector("#schema-wrapper").appendChild(details);
}

GetSchema().then((r) => {
    r.forEach(res => {
        if(res.sql) {
            SchemaSQLToTableObjects(res.sql);
        }
    });
    tableObjects.forEach(to => {
        if(to.name != "sqlite_sequence(name") {
            RenderTableObject(to);
        }
    });
});