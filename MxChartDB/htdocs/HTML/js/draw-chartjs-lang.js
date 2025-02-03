    var ixButtonTextBase = 40;
    var messageFormats = [
        //message texts (0+...):
        {//0
            de: '{0}',
            en: '{0}'
        },
        {//1
            de: '<b>{0}</b> Datensätze, <b>{1}</b> bis <b>{2}</b>',
            en: '<b>{0}</b> records, <b>{1}</b> till <b>{2}</b>'
        },
        {//2
            de: "Nur Dateinamen 'MxChartDB*.json' sind möglich!",
            en: "Only filenames 'MxChartDB*.json' are allowed!"
        },
        {//3
            de: 'keine Chart Id angegeben, Abbruch!',
            en: 'No chart id given, break!'
        },
        {//4
            de: '--- Vergrößern: mit Mausrad --- Ziehen: mit Maus --- Bereich wählen: mit Maus+Strg ---',
            en: '--- zoom: with mousewheel --- drag: with mouse --- drag to zoom: with mouse+ctrl ---'
        },
        {//5
            de: "Fehler in Formel '{0}': {1}, Abbruch!",
            en: "Error in formula '{0}': {1}, break!"
        },
        {//6
            de: "Wert '{0}' kann nicht verarbeitet werden: {1}, Abbruch!",
            en: "Cannot process value '{0}': {1}, break!"
        },
        {//7
            de: 'Letzte Aktualisierung: {0}',
            en: 'Last Refresh: {0}'
        },
        {//8
            de: 'Letzte Aktualisierung: {0}, keine Änderung',
            en: 'Last Refresh: {0}, no change'
        },
        {//9
            de: 'Datei % wird gesucht...',
            en: 'Looking for file {0}...'
        },
        {//10
            de: 'Datei % wird eingelsen...',
            en: 'Reading file {0}...'
        },
        {//11
            de: 'Datei % wird gezeichnet...',
            en: 'Drawing file {0}...'
        },
        {//!2
            de: 'Vorbereitung der Daten...',
            en: 'Preparing data...'
        },
        {//13
            de: 'Vorbereitung der Bezeichner...',
            en: 'Preparing labels...'
        },
        {//14
            de: 'Alte Geräte',
            en: 'Old Devices'
        },
        {//15
            de: 'Neue Geräte',
            en: 'New Devices'
        },
        {//16
            de: 'Vorbereitung der Meßwerte...',
            en: 'Preparing values...'
        },
        {//17
            de: "Die Anzahl der Geräte wurde geändert.<br>Soll der bestehende Chart gelöscht?"+
                "<br>Diese Angabe muss in der Konfiguration gemacht werden.",
            en: "The number of devices have been changed.<br>Should the existing diagram be deleted?"+
                "<br>This entry must be made in the chart configuration."
        },
        {//18
            de: "Geräte wurden ausgetauscht.<br>Soll der bestehende Chart gelöscht oder fortgesetzt werden?"+
                "<br>Diese Angabe muss in der Konfiguration gemacht werden.",
            en: "Devices have been exchanged.<br>Should the existing diagram be deleted or continued?"+
                "<br>This entry must be made in the chart configuration."
        },
        {//19
            de: "Weitere Geräte wurden angefügt.<br>Soll der bestehende Chart gelöscht oder fortgesetzt werden?"+
                "<br>Diese Angabe muss in der Konfiguration gemacht werden.",
            en: "More devices have been added.<br>Should the existing diagram be deleted or continued?"+
                "<br>This entry must be made in the chart configuration."
        },
        {//20
            de: 'Sie müssen sich zuerst als Administratur anmelden!',
            en: 'You have to log in first as administrator!'
        },
        {//21
            de: 'Hallo, leider haben Sie nicht die erforderlichen Administratorrechte!',
            en: 'Hallo, sorry, you have no administrator rights to read the data!'
        },
        {//22
            de: 'Noch keine Daten vorhanden!',
            en: "No data available yet!"
        },
        {//23
            de: 'Titel',
            en: 'Title'
        },
        {//24
            de: 'Formelfehler bei Sensor {0} ({1}) um {2}',
            en: 'Formula problem at sensor {0} ({1}) at {2}'
        },
        {//25
            de: 'Die Formel kann mit den vorhandenen Daten nicht aufgelöst werden',
            en: 'The formula  cannot be solved with the current data'
        },
        {//26
            de: '--- Vergrößern: mit Mausrad --- Ziehen: mit Maus --- Bereich wählen: mit Maus+Strg ---',
            en: '--- zoom: with mousewheel --- drag: with mouse --- drag to zoom: with mouse+Ctrl ---'
        },
        {//27
            de: 'Sensor={0}, Punkt={1}, Zeit={2}: numerische und Textwerte können nicht gemischt werden!'+
                ' {3} >< {4}',
            en: 'sensor={0}, point={1}, Time={2}: you cannot mix numeric and text labels!'+
                ' {3} >< {4}',
        },
        {//28
            de: 'Sensor={0}, Punkt={1}, Zeit={2}: für Balkendiagramme sind nur numerische Werte zulässig!',
            en: 'sensor={0}, point={1}, Time={2}: you cannot use bar charts with text labels!'
        },
        {//29
            de: 'Sensor={0}: Formelfehler\n{1}!',
            en: 'sensor={0}: formula error\n{1}!'
        },
        {//30
            de: 'Fehler beim Laden von Bild {0}',
            en: 'error loading image {0}!'
        },
        {//31
            de: 'Der Chart existiert nicht.',
            en: "The chartdoesn't exist.",
        },
        {
            de: 'Die Chartdatei nicht gefunden\n\n'+
                  'Mögliche Ursachen:\n'+
                  '- die Chartdatei existiert nicht\n'+
                  '- für Windows Server: Sie benötigen Administratorrechte\n'+
                  '- für Linux Server: es fehlt der Eintrag in .syscommands,\n'+
                  '      alternativ benötigen Sie Administratorrechte',
            en: 'Chart Index not found\n\n'+
                  'Possible reasons:\n'+
                  '- the chartfile is not existing\n'+
                  '- for Windows server: you need administrator rights\n'+
                  '- for Linux server: entry in .syscommands is missing\n'+
                  '      alternatively you need administrator rights',
        },
        {
            de: 'Der Dateiverweis ist nicht mehr gültig. Bitte neu selektieren!',
            en: 'File reference is no longer valid. Please reselect!'
        },
        {
            de: '❗',
            en: '❗'
        },
        {//35
            de: '{0} Datensätze gespeichert seit {1}',
            en: '{0} records stored since {1}'
        },
        {//36
            de: 'keine Meßwerte gespeichert',
            en: 'no sensor values stored'
        },
        {//37
            de: "37 not used" ,
            en: "37 not used"
        },
        {//38
            de: "Fehler im globalen Javascript Code:\n{0}" ,
            en: "error in global Javascript code:\n{0}"
        },
        {//39
            de: "Division durch 0" ,
            en: "the result is not an infinite number}"
        },

        //ixButtonTextBase button texts (409+...):
        {//0
            de: 'Dateien durchsuchen...',
            en: 'Browse data...'
        },
        {
            de: 'Konfiguration',
            en: 'Configuration'
        },
        {//2
            de: 'Chart Daten',
            en: 'Chart Data'
        },
        {//3
            de: 'Zeitintervall' ,
            en: 'time picker'
        },
        {
            de: 'Neues Fenster',
            en: 'New Window'
        },
        {//5
            de: '{0}',
            en: '{0}'
        },
        {
            de: 'auf dem lokalen Rechner',
            en: 'on local computer'
        },
        {//7
            de: 'Minuten,Stunden,Tage,Wochen,Monate,Jahre',
            en: 'minutes,hours,days,weeks,months,years'
        },
        {
            de: 'Aktualisieren ',
            en: 'Refresh '
        },
        {//9
            de: 'Aktualisierung einmal pro Minute',
            en: 'refreshing once per minute'
        },
        {
            de: 'Maus Modus Ändern',
            en: 'Change Mouse Mode'
        },
        {//11
            de: 'Zurückseten zum Ausgangsstatus', 
            en: 'reset to initial state'
        },
        {//12
            de: 'um 1 Seite nach rechts schieben',
            en: 'shift to right 1 page'
        },
        {
            de: 'Index',
            en: 'Index'
        },
        {//14
            de: 'um ½ Seite nach rechts schieben',
            en: 'shift to right ½ page'
        },
        {//15
            de: 'um ½ Seite nach links schieben',
            en: 'shift to left ½ page'
        },
        {
            de: 'Infobox ',
            en: 'Tooltip '
        },
        {//17
            de: 'Zeige Index ',
            en: 'Show Index '
        },
        {//18
            de: 'Anzeigeintervall ',
            en: 'Display Interval'
        },
        {//19
            de: '\u2007 \u2007 von: ',
            en: '\u2007 \u2007 from: '
        },
        {//20
            de: 'bis: ',
            en: 'to: '
        },
        {//21
            de: 'Intervall: ',
            en: 'Interval: '
        },
        {//22
            de: 'Chart Anzeigen',
            en: 'Display Chart'
        },
        {//23
            de: 'Abbruch',
            en: 'Break'
        },
        {//24
            de: 'um 1 Seite nach links schieben',
            en: 'shift to left 1 page'
        },
        {//25
            de: 'alle gepufferten Werte auf einer Seite anzeigen',
            en: 'view all buffered values on one page'
        },
        {//26
            de: 'Auswahl eines Zeitintervalls',
            en: 'date-time picker'
        },
        {//27
            de: '- Komplette Historie anzeigen',
            en: '- View complete history'
        },
        {//28
            de: 'Anzeige bis zum Intervall verschieben',
            en: 'Shift and size to interval'
        },
        {//29
            de: '- Anzeigeoptionen',
            en: '- Display options'
        },
        {//30
            de: '- Historisches Intervall',
            en: '- Historical interval'
        },
        {//31
            de: 'Snapshot erstellen',
            en: 'Take Snapshot'
        },
        {//32
            de: 'Berechnung',
            en: 'Calculation'
        },
        {//33
            de: 'Breite',
            en: 'Width'
        },
        {//34
            de: 'Breite',
            en: 'Width'
        },
        {//35
            de: ' > \u25A3 < ',
            en: ' > \u25A3 < '
        },
        {//36
            de: ' < \u25A3 > ',
            en: ' < \u25A3 > '
        },
        {//37
            de: 'Ad-hoc Analyse',
            en: 'Ad hoc Analysis'
        },
    ];
