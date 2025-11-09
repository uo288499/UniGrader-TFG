Feature: Manage study programs

  Scenario: Create, filter, edit and delete a study program
    Given I am logged in as the admin of a university
    When I open the study programs list
    Then the list should be empty

    When I attempt to create a study program with invalid data
    Then I should see validation errors

    When I create a valid new study program
    Then I should see the new study program in the list

    When I apply correct filters for that study program
    Then the filters work and I see that study program

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the study program
    Then I should see the changes in the list

    When I delete the study program
    Then the list should be empty again
