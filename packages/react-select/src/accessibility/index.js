export const instructionsAriaMessage = (event, context) => {
  const { isSearchable, isMulti, label, isDisabled, tabSelectsValue } = context;
  switch (event) {
    case 'menu':
      return `Use Up and Down to choose options${
        isDisabled ? '' : ', press Enter to select the currently focused option'
      }, press Escape to exit the menu${
        tabSelectsValue
          ? ', press Tab to select the option and exit the menu'
          : ''
      }.`;
    case 'input':
      return `${label ? label : 'Select'} is focused ${
        isSearchable ? ',type to refine list' : ''
      }, press Down to open the menu, ${
        isMulti ? ' press left to focus selected values' : ''
      }`;
    case 'value':
      return 'Use left and right to toggle between focused values, press Backspace to remove the currently focused value';
  }
};

export const valueEventAriaMessage = (event, context) => {
  const { value, isDisabled } = context;
  if (!value) return;
  switch (event) {
    case 'deselect-option':
    case 'pop-value':
    case 'remove-value':
      return `option ${value}, deselected.`;
    case 'select-option':
      return isDisabled
        ? `option ${value} is disabled. Select another option.`
        : `option ${value}, selected.`;
  }
};

export const valueFocusAriaMessage = ({
  focusedValue,
  getOptionLabel,
  selectValue,
}) =>
  `value ${getOptionLabel(focusedValue)} focused, ${selectValue.indexOf(
    focusedValue
  ) + 1} of ${selectValue.length}.`;

export const optionFocusAriaMessage = ({
  focusedOption,
  getOptionLabel,
  options,
}) =>
  `option ${getOptionLabel(focusedOption)} focused${
    focusedOption.isDisabled ? ' disabled' : ''
  }, ${options.indexOf(focusedOption) + 1} of ${options.length}.`;

export const resultsAriaMessage = ({ inputValue, screenReaderMessage }) =>
  `${screenReaderMessage}${
    inputValue ? ' for search term ' + inputValue : ''
  }.`;
