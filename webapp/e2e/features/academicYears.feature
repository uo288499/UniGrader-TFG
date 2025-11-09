Feature: Manage academic years

  Scenario: Create, filter, edit and delete an academic year
    Given I am logged in as the admin of a university
    When I open the academic years list
    Then the list should be empty

    When I attempt to create an academic year with invalid data
    Then I should see validation errors

    When I create a valid new academic year
    Then I should see the new academic year in the list

    When I apply correct filters for that academic year
    Then the filters work and I see that academic year

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I edit the academic year
    Then I should see the changes in the list

    When I delete the academic year
    Then the list should be empty again