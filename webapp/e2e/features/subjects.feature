Feature: Manage subjects

  Scenario: Create, filter, edit and delete a subject
    Given I am logged in as the admin of a university
    When I open the subjects list
    Then the list should be empty

    When I attempt to create a subject with invalid data
    Then I should see validation errors

    When I create a valid new subject
    Then I should see the new subject in the list

    When I apply correct filters for that subject
    Then the filters work and I see that subject

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the subject
    Then I should see the changes in the list

    When I delete the subject
    Then the list should be empty again