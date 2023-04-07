time {
    # Define the number of processes to start
    n=20
    node create_rand_balance.js
    wait
    
    node set_initial_users.js
    wait

    # Start n instances of the javascript script
    for i in $(seq 1 $n); do
        node balance_worker.js $i &
    done

    # Wait for all background processes to complete
    wait
}