# Slot Settings Conversion Instructions

Edit one SlotSettings.php file at a time. Do not attempt to edit multiple files simultaneously, as this will not work.

For each SlotSettings.php file:

1. Change the namespace to `Games` and add the import statement: `use Games\BaseSlotSettings;`

2. Modify the class declaration to extend `BaseSlotSettings`.

3. Update the constructor to accept only a `$slotSettings` parameter. Remove all existing parameters.

4. Add a line in the constructor to call the parent constructor with the `$slotSettings` parameter.

5. Remove any code in the constructor that references `\VanguardLTE\`.

6. Analyze the `BaseSlotSettings` file. Remove any methods from the current SlotSettings file that are implemented in the base file.

No other changes are to be made at this time.
