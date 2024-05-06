    var ixButtonTextBase = 0;
    var messageFormats = [
        //message texts (0+...):
        {
            de: '{0}',
            en: '{0}'
        },
        {
            de: 'keine Datei angegeben, Abbruch!',
            en: 'no filename given, break!'
        },
        {
            de: "Instanz",
            en: "Instance"
        },
        {
            de: 'Fehler beim Lesen von {0}: {1}',
            en: 'Error reading {0}: {1}'
        },
        {//4
            de: 'Chart Index',
            en: 'Chart Index'
        },
        {//5
            de: 'Chart Titel',
            en: 'Chart Title'
        },
        {//6
            de: 'Chart Id',
            en: 'Chart Id'
        },
        {//7
            de: 'aktiv',
            en: 'active'
        },
        {//8
            de: '❎',
            en: '❎'
        },
        {//9
            de: ' ',
            en: ' '
        },
        {//10
            de: 'verwaist',
            en: 'orphaned'
        },
        {//11
            de: 'Fehler',
            en: 'error'
        },
        {//12
            de: 'Chart Index nicht gefunden',
            en: 'Chart Index not found',
        },
        {//13
            de: 'Sie müssen als Administrator angemeldet sein, um Änderungen vornehmen zu können!',
            en: 'You have to be logged in as administrator doing changes!',
        },
        {//14
            de: 'Chartdaten<br>klonen',
            en: 'Clone<br>Chart Data',
        },
        {//15
            de: 'Chartdaten<br>löschen',
            en: 'Drop<br>Chart Data',
        },
        {//16
            de: 'Fehler beim Bereinigen von {0}: {1}, {2}',
            en: 'Error clearing {0} data: {1}, {2}',
        },
        {//17
            de: 'Chart Administration',
            en: 'Chart Administration'
        },
        {//18
            de: 'Alle gespeicherten Daten zu {0} komplett löschen?',
            en: 'Completely delete all stored data of {0}?'
        },
        {//19
            de: 'Alle gespeicherten Daten zu {0} wurden gelöscht.',
            en: 'All stored data of {0} were removed completely.'
        },
        {//20
            de: 'Eventuell die Chartdefinition öffnen und neu speichern.',
            en: 'Maybe it helps to open and save chart definition again.'
        },
        {//21
            de: 'Neue Chart Id:',
            en: 'New Chart Id:'
        },
        {//22
            de: 'Eine Kopie von {0} wurde erstellt.',
            en: 'A copy of {0} is created.'
        },
        {//23
            de: 'Fehler beim Schreiben von {0}: {1}, {2}',
            en: 'Error writing {0}: {1}, {2}',
        },
        {//24
            de: 'Fehler beim Löschen von {0}: {1}, {2}',
            en: 'Error deleting {0}: {1}, {2}',
        },
        {//25
            de: 'Fehler beim Schreiben von {0}: Der Chart {1} existiert bereits',
            en: 'Error writing {0}: chart {1} already exists',
        },
        {//26
            de: 'Kopie',
            en: 'copy'
        },
        {//27
            de: 'Unzulässiges Format',
            en: 'Invalif format'
        },
        {//28
            de: 'Dateiname ist nicht erlaubt',
            en: 'Filename is not allowed'
        },
        {//29
            de: 'Fehler beim Lesen der Datei: {0]',
            en: 'Error reading file: {0]'
        },
        {//30
            de: 'Die Datei enthält keine Chartdaten',
            en: "The file doesn't contain chart data",
        },
        {//31
            de: '{0}: die Chartdaten wurden übernommen',
            en: "{0}: the chart data are inserted",
        },
        {//32
            de: 'Die Daten der Datei unter der folgenden Chart Id speichern:',
            en: "Store the file data with following chart id:",
        },
        {//33
            de: 'Download<br>Chartdaten',
            en: 'Download<br>Chart Data',
        },
        {//34
            de: 'Keine Headerdaten für diesen Chart gefunden.',
            en: 'No header data found for this chart.',
        },
        {//35
            de: 'Chart Id = {0} ist bereits vorhanden!',
            en: 'Chart Id = {0} is already existing!',
        },
        {//36
            de: 'Filter...',
            en: 'Filter...',
        },
        {//37
            de: 'Instanz {0} auf active={1} gesetzt',
            en: 'instance {0} set to active={1}',
        },
        {//38
            de: 'produktive Charts ',
            en: 'productive charts '
        },
        {//39
            de: 'verwaiste Charts ',
            en: 'orphaned charts '
        },
        {//40
            de: 'Snapshots ',
            en: 'snapshots '
        },
        {//41
            de: 'Snapshot',
            en: 'Snapshot'
        },
        {//42
            de: 'Datenbank<br>wechseln',
            en: 'Change<br>Database',
        },
    ];
