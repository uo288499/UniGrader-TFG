Feature: Manage evaluation types

  Scenario: Create, filter, edit and delete an evaluation type
    Given I am logged in as the admin of a university
    When I open the evaluation types list
    Then the list should be empty

    When I attempt to create an evaluation type with invalid data
    Then I should see validation errors

    When I create a valid new evaluation type
    Then I should see the new evaluation type in the list

    When I apply correct filters for that evaluation type
    Then the filters work and I see that evaluation type

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the evaluation type
    Then I should see the changes in the list

    When I delete the evaluation type
    Then the list should be empty again
