Feature: Manage groups

  Scenario: Create, filter, edit and delete a group
    Given I am logged in as the admin of a university
    When I open the groups list
    Then the list should be empty

    When I attempt to create a group with invalid data
    Then I should see validation errors

    When I create a valid new group
    Then I should see the new group in the list

    When I apply correct filters for that group
    Then the filters work and I see that group

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the group
    Then I should see the changes in the list

    When I delete the group
    Then the list should be empty again
