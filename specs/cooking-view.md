# Cooking view

A view for following a recipe in the kitchen on an iPad.

- [x] The view uses large text that is readable from a distance.
- [x] All the steps are listed in the view so they are readable at the same time.
- [x] User can highlight a step so it is more clearly visible.
- [x] User can tick off ingredients.
- [x] The screen stays awake while the view is open.

## Remembering the state

- [x] If the user leaves the cooking view and comes back, the view shows the same state: the ticked ingredients and the highlighted step. Any new state that changes the view visibly, such as ticks on steps, is remembered too. The scroll position and the zoom level are not.
- [x] Each recipe has its own state.
- [x] The state is stored on the device only.
- [x] The state is forgotten 12 hours after the last change.
- [x] Closing the cooking view does not clear the state.
- [x] User can clear the state with a button in the cooking view.
