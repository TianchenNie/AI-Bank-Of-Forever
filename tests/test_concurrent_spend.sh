time {
    # Define the number of processes to start
    n=80
    node set_initial_users.js

    wait

    # Start n instances of the javascript script
    for i in $(seq 1 $n); do
        node spend_worker.js $i &
    done

    # Wait for all background processes to complete
    wait

    node verify_spend.js $n
    wait
}