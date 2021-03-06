import { OHIF } from 'meteor/ohif:core';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

/*
 * formItem: create a generic controller for form items
 * It may be used to manage all components that belong to forms
 */
OHIF.mixins.formItem = new OHIF.Mixin({
    dependencies: 'schemaData',
    composition: {

        onCreated() {
            const instance = Template.instance();
            const component = instance.component;

            // Create a observer to monitor changed values
            component.changeObserver = new Tracker.Dependency();

            // Register the component in the parent component
            component.registerSelf();

            // Declare the component elements that will be manipulated
            component.$element = $();
            component.$style = $();
            component.$wrapper = $();

            // Get or set the component's value using jQuery's val method
            component.value = value => {
                const isGet = _.isUndefined(value);
                if (isGet) {
                    return component.parseData(component.$element.val());
                }

                component.$element.val(value).trigger('change');
            };

            // Disable or enable the component
            component.disable = isDisable => {
                component.$element.prop('disabled', !!isDisable);
            };

            // Set or unset component's readonly property
            component.readonly = isReadonly => {
                component.$element.prop('readonly', !!isReadonly);
            };

            // Show or hide the component
            component.show = isShow => {
                const method = isShow ? 'show' : 'hide';
                component.$wrapper[method]();
            };

            // Check if the focus is inside this element
            component.hasFocus = () => {
                // Get the focused element
                const focused = $(':focus')[0];

                // Check if the focused element is inside the component
                const contains = $.contains(component.$wrapper[0], focused);
                const isEqual = component.$wrapper[0] === focused;

                // Return true if he component has the focus
                return contains || isEqual;
            };

            // Add or remove a state from the component
            component.state = (state, flag) => {
                component.$wrapper.toggleClass(`state-${state}`, !!flag);
            };

            // Set the component in error state and display the error message
            component.error = errorMessage => {
                // Set the component error state
                component.state('error', errorMessage);

                // Set or remove the error message
                if (errorMessage) {
                    component.$wrapper.attr('data-error', errorMessage);
                } else {
                    component.$wrapper.removeAttr('data-error', errorMessage);
                }
            };

            // Toggle the tooltip over the component
            component.toggleTooltip = (isShow, message) => {
                if (isShow && message) {
                    // Stop here if the tooltip is already created
                    if (component.$wrapper.next('.tooltip').length) {
                        return;
                    }

                    // Create the tooltip
                    component.$wrapper.tooltip({
                        trigger: 'manual',
                        title: message
                    }).tooltip('show');
                } else {
                    // Destroy the tooltip
                    component.$wrapper.tooltip('destroy');
                }
            };

            // Toggle a state message as a tooltip over the component
            component.toggleMessage = isShow => {
                // Check if the action is to hide
                if (!isShow) {
                    Meteor.setTimeout(() => {
                        // Check if the component has the focus
                        if (component.hasFocus()) {
                            // Prevent the tooltip from being hidden
                            return;
                        }

                        // Hide the tooltip
                        component.toggleTooltip(false);
                    }, 100);
                    return;
                }

                // Check for error state and message
                const errorMessage = component.$wrapper.attr('data-error');
                if (errorMessage) {
                    // Show the tooltip with the error message
                    component.toggleTooltip(true, errorMessage);
                }
            },

            // Search for the parent form component
            component.getForm = () => {
                let currentComponent = component;
                while (currentComponent) {
                    currentComponent = currentComponent.parent;
                    if (currentComponent && currentComponent.isForm) {
                        return currentComponent;
                    }
                }
            };

            // Get the current component API
            component.getApi = () => {
                const api = instance.data.api;

                // Check if the API was not given
                if (!api) {
                    // Stop here if the component is form and API was not given
                    if (component.isForm) {
                        return;
                    }

                    // Get the current component's form
                    const form = component.getForm();

                    // Stop here if the component has no form
                    if (!form) {
                        return;
                    }

                    return form.getApi();
                }

                // Return the given API
                return api;
            };

            // Check if the component value is valid in its form's schema
            component.validate = () => {
                // Get the component's form
                const form = component.getForm();

                // Get the form's data schema
                const schema = form && form.schema;

                // Get the current component's key
                const key = instance.data.pathKey;

                // Return true if validation is not needed
                if (!key || !schema || !component.$wrapper.is(':visible')) {
                    return true;
                }

                // Create the data document for validation
                const document = OHIF.object.getNestedObject({
                    [key]: component.value()
                });

                // Get the validation result
                const validationResult = schema.validateOne(document, key);

                // Notify the form that the validation ran
                form.validationRan();

                // Check if the document validation failed
                if (!validationResult) {
                    // Set the component in error state and display the message
                    component.error(schema.keyErrorMessage(key));

                    // Return false for validation
                    return false;
                }

                // Remove the component error state and message
                component.error(false);

                // Return true for validation
                return true;
            };

            component.depend = () => {
                return component.changeObserver.depend();
            };

        },

        onRendered() {
            const instance = Template.instance();
            const component = instance.component;

            // Set the element to be controlled
            component.$element = instance.$(':input').first();

            // Set the most outer wrapper element
            component.$wrapper = instance.wrapper.$('*').first();

            // Add the pathKey to the wrapper element
            component.$wrapper.attr('data-key', instance.data.pathKey);
        },

        onDestroyed() {
            const instance = Template.instance();

            // Register the component in the parent component
            instance.component.unregisterSelf();
        },

        onMixins() {
            const instance = Template.instance();
            const component = instance.component;

            // If no style element was defined, set it as the element itself
            if (!component.$style.length) {
                component.$style = component.$element;
            }

            // Set the component in element and wrapper jQuery data
            component.$element.data('component', component);
            component.$wrapper.data('component', component);
        },

        events: {

            // Handle the change event for the component
            change(event, instance) {
                const component = instance.component;

                // Prevent execution on upper components
                if (event.currentTarget === component.$element[0]) {
                    // Enable reactivity by changing a Tracker.Dependency observer
                    component.changeObserver.changed();

                    const form = component.getForm();
                    if (form && form.isValidatedAlready) {
                        // Revalidate the component if form is already validated
                        component.validate();
                    }
                }
            },

            focus(event, instance) {
                const component = instance.component;

                // Stop here if it is an group
                if (component.isGroup || component.isCustomFocus) {
                    return;
                }

                // Prevent event bubbling
                event.stopPropagation();

                // Check for state messages and show it
                component.toggleMessage(true);
            },

            blur(event, instance) {
                const component = instance.component;

                // Stop here if it is an group
                if (component.isGroup || component.isCustomFocus) {
                    return;
                }

                // Prevent event bubbling
                event.stopPropagation();

                // Hide state messages
                component.toggleMessage(false);
            }

        }

    }
});
