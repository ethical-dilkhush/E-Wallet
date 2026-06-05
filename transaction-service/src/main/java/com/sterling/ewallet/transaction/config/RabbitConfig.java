package com.sterling.ewallet.transaction.config;

import com.sterling.ewallet.common.messaging.RabbitTopics;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    @Bean
    public TopicExchange ewalletExchange() {
        return new TopicExchange(RabbitTopics.EWALLET_EXCHANGE, true, false);
    }

    @Bean
    public Queue transactionInitiatedQueue() {
        return new Queue(RabbitTopics.TRANSACTION_INITIATED_QUEUE, true);
    }

    @Bean
    public Queue walletResultQueue() {
        return new Queue(RabbitTopics.WALLET_RESULT_QUEUE, true);
    }

    @Bean
    public Queue transactionCompletedQueue() {
        return new Queue(RabbitTopics.TRANSACTION_COMPLETED_QUEUE, true);
    }

    @Bean
    public Binding transactionInitiatedBinding(Queue transactionInitiatedQueue, TopicExchange ewalletExchange) {
        return BindingBuilder.bind(transactionInitiatedQueue).to(ewalletExchange)
                .with(RabbitTopics.TRANSACTION_INITIATED_ROUTING_KEY);
    }

    @Bean
    public Binding walletResultBinding(Queue walletResultQueue, TopicExchange ewalletExchange) {
        return BindingBuilder.bind(walletResultQueue).to(ewalletExchange)
                .with(RabbitTopics.WALLET_RESULT_ROUTING_KEY);
    }

    @Bean
    public Binding transactionCompletedBinding(Queue transactionCompletedQueue, TopicExchange ewalletExchange) {
        return BindingBuilder.bind(transactionCompletedQueue).to(ewalletExchange)
                .with(RabbitTopics.TRANSACTION_COMPLETED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }
}
