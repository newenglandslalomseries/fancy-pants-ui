This repo contains web apps for the Fancy Pants whitewater gate
judging and scoring system used by the [New England Slalom
Series](https://www.nessrace.com/).

# Scoring app

The scoring app is https://bjaspan.github.io/fancy-pants-ui/index.html.

## Editing the race configuration

The `current_race.json` file configures the app:

```
{
  "race_name": "Sample Slalom",
  "stations": [
    { "name": "Start", "max_gate": 2 },
    { "name": "Station A", "max_gate": 6 },
    { "name": "Station B", "max_gate": 12 },
    { "name": "Station C", "max_gate": 18 },
    { "name": "Station D", "max_gate": 25 },
    { "name": "Finish", "is_finish": true }
  ]
}
```

* The race_name is displayed at the top of the scoring app.
* Add or remove stations as necessary. Set max_gate to the highest
  number for that station. In this example, `Start` is judging gates 1
  and 2, `Station A` is judging gates 3, 4, 5, and 6, etc.
* The station with `"is_finish": true` will have the field to enter raw run time.
* IMPORTANT: Do not add extra  commas after `max_gate` or the last station entry.

To edit the file (assuming you have permission):

* On https://github.com/bjaspan/fancy-pants-ui, click on the
  `current_race.json` file name it to view the file's contents.
* Type "." which opens the GitHub web editor.
* Make your changes.
* On the left side of the editor, click the "Sourch Control" icon (it
looks like a litte graph) which is the fourth from the top.
* Enter a message such as "Updated for 2026 Kenduskeg Slalom."
* Press "Commit & Push".

Wait a few minutes then refresh the scoring app in your browser to see the changes.

## The Google Form and spreadsheet

The scoring app submits results to this [Google
Form](https://docs.google.com/forms/d/e/1FAIpQLSe8BGyWb91SaPUdOfizgt0bZvLgCLwBp2P4gPCOHiruyRaOUw/viewform). The
app contains specific field IDs from this form so it can only work
with this specific form. However, the form can be changed to write its results to any spreadsheet.

To change the spreadsheet that the form writes to:

* Edit the form by clicking the pencil icon in the lower right corner
  or just visit the [edit
  page](https://docs.google.com/forms/d/1WELca83m8ENYqJy3QoDPX_Ncn0fcJ_WWDBNn6FVMtRw/edit)
  directly.
* Click on [responses](https://docs.google.com/forms/d/1WELca83m8ENYqJy3QoDPX_Ncn0fcJ_WWDBNn6FVMtRw/edit#responses).
* Click the three-dots icon on the top right side of the form and
  choose "Delete All Responses" unless you want the current responses
  to be written to the new spreadsheet you are about to select.
* Click the three-dots icon again and choose "Unlink form" to disconenct from the current spreadsheet.
* Click "Link to sheets" at the top of the form.
* Choose "Select existing spreadsheet" then select the race spreadsheet you want.
* A new sheet named something like "Form Responses N" will be created in the spreadsheet you choose.

Now that you've created a new scoring form results sheet in the race
spreadsheet, you need to udpate the Raw Results sheet to read from it:

* Vist the Raw Reslts sheet and click on any cell except in the Run # column.
* The cell will contain a formula like `=INDIRECT(CONCAT("'Form
    Responses 5'!",ADDRESS(ROW(),COLUMN())))` or `='Form Responses
    5'!A1`.
* Selecth Edit menu > Find and replace.
* Enter the old form response sheet name, like "Form Responses 5", into the Find box.
* Enter the new form response sheet name, likee "Form Responses 6", into the Replace with box.
* In the Search drop down, choose "All sheets" (though only the Raw Results sheet should actually reference it).
* Check the "Also search within formulas" checkbox.
* Click "Replace all".
* Click "Done".

Hopefully that works. :-)

## Changing the submission form

If we need to add new fields to or replace the scoring submission form, we have to
update the "entry IDs" in the HTML and Javascript code in the app. To get the entry IDs for a form:

* [Edit](https://docs.google.com/forms/d/e/1FAIpQLSe8BGyWb91SaPUdOfizgt0bZvLgCLwBp2P4gPCOHiruyRaOUw/viewform?usp=pp_url&entry.1708578938=17) the form.
* Click the three-dots icon at the top right of the page (not the top-right of the form) and select "Pre-fill form".
* A new  browser tab will open to display the form. Enter a value for every question that you need the entry ID for.
* At the bottom of the form, click "Get link".
* Click the "Copy link" button that appears. This copies a pre-filled form URL to the copy-and-paste buffer.

The pre-filled form contains GET query parameters for each form
question that had a value. For example, when I only clicked on the
"Clean" button for gate 50, the pre-filled form link was
`https://docs.google.com/forms/d/e/1FAIpQLSe8BGyWb91SaPUdOfizgt0bZvLgCLwBp2P4gPCOHiruyRaOUw/viewform?usp=pp_url&entry.1989426203=Touch`
so `entry.1989426203` is the entry ID for the Gate #50 question.

# Results viewer app

The results viewer app is https://bjaspan.github.io/fancy-pants-ui/results.html.

## Adding races to the viewer

The `races.json` file configures the viewer:

```
{
  "races": [
    {
      "name": "Farmington Slalom 2025",
      "url": "https://docs.google.com/spreadsheets/d/1gvGgLJ8jx9a8tfydTlQowOHLPJ_dG-0iW1iOfEvdIfs/edit?gid=1657054501#gid=1657054501"
    }
  ]
}
```

To add a new race spreadsheet, add a new curly-bracket (`{}`) object
with keys `name` and `url` to the square-bracket (`[]`) array:

```
{
  "races": [
    {
      "name": "Kenduskeg Slalom 2025",
      "url": "https://docs.google.com/spreadsheets/d/..."
    },
    {
      "name": "Farmington Slalom 2025",
      "url": "https://docs.google.com/spreadsheets/d/1gvGgLJ8jx9a8tfydTlQowOHLPJ_dG-0iW1iOfEvdIfs/edit?gid=1657054501#gid=1657054501"
    }
  ]
}
```

The URL must be for the "Unfiltered Results" sheet in the
spreadsheet. It is identified by the `gid` key in the URL.

Add a comma between the name and url values and between entries in the
array, but not after the url value or after the final entry in the
array.

The results viewer displays the races in the order they appear in the
file and selects the first race in the file when initially loaded.
