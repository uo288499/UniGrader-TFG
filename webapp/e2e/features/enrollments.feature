Feature: Manage enrollments

  Scenario: Create, filter and delete an enrollment
    Given I am logged in as the admin of a university
    When I open the enrollments list
    Then the list should be empty

    When I create a new enrollment
    Then I should see the enrollment in the list

    When I apply correct filters for that enrollment
    Then the filters work and I see that enrollment

    When I apply non matching filters
    Then the filters work and the no-results state appears

    When I delete the enrollment
    Then the list should be empty again