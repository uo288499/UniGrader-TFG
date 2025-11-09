Feature: Manage universities

  Scenario: Create, filter, edit and delete a university
    Given I am logged in as the global admin
    When I open the universities list
    Then the list should be empty

    When I attempt to create a university with invalid data
    Then I should see validation errors

    When I create a valid new university
    Then I should see the new university in the list

    When I apply correct filters for that university
    Then the filters work and I see that university

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the university
    Then I should see the changes in the list

    When I delete the university
    Then the list should be empty again